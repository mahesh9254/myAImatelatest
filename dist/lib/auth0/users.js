"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const randomstring = require("randomstring");
// local dependencies
const auth0requests = require("./requests");
const passphrases = require("./passphrases");
const env = require("../utils/env");
const notifications = require("../notifications/slack");
async function getBearerToken() {
    const body = await auth0requests.getOauthToken();
    return body.access_token;
}
exports.getBearerToken = getBearerToken;
function verifyTenant(student, tenant) {
    if (student.tenant !== tenant) {
        const invalidTenant = new Error('Invalid tenant');
        invalidTenant.statusCode = 404;
        invalidTenant.error = 'Not Found';
        invalidTenant.message = 'Userid with this tenant not found';
        invalidTenant.errorCode = 'inexistent_user';
        throw invalidTenant;
    }
}
function verifyRole(student, role) {
    if (student.role !== role) {
        const invalidUser = new Error('Invalid user role');
        invalidUser.statusCode = 404;
        invalidUser.error = 'Not Found';
        invalidUser.message = 'User with the specified userid and role not found';
        invalidUser.errorCode = 'inexistent_user';
        throw invalidUser;
    }
}
async function getStudent(tenant, userid) {
    try {
        const token = await getBearerToken();
        const response = await auth0requests.getUser(token, userid);
        const student = response.app_metadata;
        verifyTenant(student, tenant);
        verifyRole(student, 'student');
        return {
            id: response.user_id,
            username: response.username,
            last_login: response.last_login,
        };
    }
    catch (err) {
        if (err && err.response && err.response.body) {
            throw err.response.body;
        }
        else {
            throw err;
        }
    }
}
exports.getStudent = getStudent;
async function getStudents(tenant, page) {
    const token = await getBearerToken();
    const students = await auth0requests.getUsers(token, tenant, page);
    return students
        .filter((student) => {
        return student.app_metadata.tenant === tenant;
    })
        .map((student) => {
        return {
            id: student.user_id,
            username: student.username,
            last_login: student.last_login,
        };
    });
}
async function getAllStudents(tenant) {
    let page = 0;
    let allstudents = [];
    let students = [];
    // the maximum size of a class is 255 students, so the most times
    //  this will ever loop is 3 times. plus each student is very small,
    //  so the overall memory implication of this loop isn't as bad
    //  as it looks
    students = await getStudents(tenant, page++);
    while (students.length === auth0requests.PAGE_SIZE) {
        allstudents = allstudents.concat(students);
        students = await getStudents(tenant, page++);
    }
    allstudents = allstudents.concat(students);
    return allstudents;
}
exports.getAllStudents = getAllStudents;
async function getStudentsByUserId(tenant) {
    const students = await getAllStudents(tenant);
    const studentsIndexedById = {};
    students.forEach((student) => {
        studentsIndexedById[student.id] = student;
    });
    return studentsIndexedById;
}
exports.getStudentsByUserId = getStudentsByUserId;
async function getTeacherByClassId(tenant) {
    const token = await getBearerToken();
    return auth0requests.getSupervisor(token, tenant);
}
exports.getTeacherByClassId = getTeacherByClassId;
async function countUsers(tenant) {
    const token = await getBearerToken();
    const usersCountsInfo = await auth0requests.getUserCounts(token, tenant);
    return usersCountsInfo.total;
}
exports.countUsers = countUsers;
async function createUser(newUserDetails) {
    const token = await getBearerToken();
    const user = await auth0requests.createUser(token, newUserDetails);
    return {
        id: user.user_id,
        username: user.username,
        password: newUserDetails.password,
    };
}
function createStudent(tenant, username) {
    return createUser({
        email: username + '@do-not-require-emailaddresses-for-students.com',
        username,
        password: passphrases.generate(),
        verify_email: false,
        email_verified: true,
        connection: process.env[env.AUTH0_CONNECTION],
        app_metadata: {
            role: 'student',
            tenant,
        },
    });
}
exports.createStudent = createStudent;
function createStudentWithPwd(tenant, username, password) {
    return createUser({
        email: username + '@do-not-require-emailaddresses-for-students.com',
        username, password,
        verify_email: false,
        email_verified: true,
        connection: process.env[env.AUTH0_CONNECTION],
        app_metadata: {
            role: 'student',
            tenant,
        },
    });
}
exports.createStudentWithPwd = createStudentWithPwd;
function createTeacher(tenant, username, email) {
    return createUser({
        email,
        username,
        password: randomstring.generate({ length: 12, readable: true }),
        verify_email: true,
        email_verified: false,
        connection: process.env[env.AUTH0_CONNECTION],
        app_metadata: {
            role: 'supervisor',
            tenant,
        },
    });
}
exports.createTeacher = createTeacher;
function createVerifiedTeacher(tenant, username, email) {
    return createUser({
        email,
        username,
        password: randomstring.generate({ length: 12, readable: true }),
        verify_email: true,
        email_verified: true,
        connection: process.env[env.AUTH0_CONNECTION],
        app_metadata: {
            role: 'supervisor',
            tenant,
        },
    });
}
exports.createVerifiedTeacher = createVerifiedTeacher;
async function deleteStudent(tenant, userid) {
    // will verify the tenant matches the student
    //   throwing an exception if there is a problem
    await getStudent(tenant, userid);
    const token = await getBearerToken();
    return auth0requests.deleteUser(token, userid);
}
exports.deleteStudent = deleteStudent;
async function deleteTeacher(tenant, userid) {
    const token = await getBearerToken();
    return auth0requests.deleteUser(token, userid);
}
exports.deleteTeacher = deleteTeacher;
async function resetPassword(tenant, userid, password, token) {
    // will verify the tenant matches the student
    //   throwing an exception if there is a problem
    await getStudent(tenant, userid);
    const user = await auth0requests.modifyUser(token, userid, { password });
    return {
        id: user.user_id,
        username: user.username,
        password,
    };
}
/**
 * Resets the password for a group of users.
 *
 * This is a very slow function, so it will return after
 * verifying that have generated the password and successfully
 * created the bearer token to use.
 *
 * @returns the password that the students will be given
 */
async function resetStudentsPassword(tenant, userids) {
    const password = passphrases.generate();
    const token = await getBearerToken();
    // Intentionally not using 'await' here - which means
    // the next line will continue without waiting for
    // the function to complete
    // This is because we don't want to force the client
    // to wait for this to finish
    backgroundResetPasswords(tenant, token, userids, password);
    return password;
}
exports.resetStudentsPassword = resetStudentsPassword;
async function backgroundResetPasswords(tenant, token, userids, password) {
    notifications.notify('Resetting passwords for ' + tenant, notifications.SLACK_CHANNELS.PASSWORD_RESET);
    let backoffMs = 5;
    const MAX_BACKOFF_MS = 5000;
    const allCreds = [];
    // auth0 will reject a large number of concurrent requests, so
    //  we do this sequentially
    for (const userid of userids) {
        const creds = await resetPassword(tenant, userid, password, token);
        allCreds.push(creds);
        // auth0 rate-limits aggressively, so protect against
        //  large workloads by waiting increasingly long times
        //  for large requests
        await pause(backoffMs);
        backoffMs += 50;
        // set an upper limit for how long to wait between requests
        backoffMs = backoffMs > MAX_BACKOFF_MS ? MAX_BACKOFF_MS : backoffMs;
    }
    notifications.notify('Resetting passwords for ' + tenant + ' complete.', notifications.SLACK_CHANNELS.PASSWORD_RESET);
    return allCreds;
}
function pause(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
async function resetStudentPassword(tenant, userid) {
    const password = passphrases.generate();
    // will verify the tenant matches the student
    //   throwing an exception if there is a problem
    await getStudent(tenant, userid);
    const token = await getBearerToken();
    const modifications = { password };
    const user = await auth0requests.modifyUser(token, userid, modifications);
    return {
        id: user.user_id,
        username: user.username,
        password,
    };
}
exports.resetStudentPassword = resetStudentPassword;
