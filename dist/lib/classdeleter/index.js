"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const slack = require("../notifications/slack");
const emails = require("../notifications/email");
const db = require("../db/store");
const auth0 = require("../auth0/users");
const auth0requests = require("../auth0/requests");
async function deleteUsers(classid, users, auth0token) {
    for (const user of users) {
        await auth0requests.deleteUser(auth0token, user.user_id);
        await db.deleteEntireUser(user.user_id, classid);
    }
}
async function deleteClass(classid) {
    slack.notify('Deleting class "' + classid + '"', slack.SLACK_CHANNELS.CLASS_DELETE);
    const auth0token = await auth0.getBearerToken();
    // The approach here is to delete the users first, and then
    // delete their stuff.
    // This is to prevent users creating more stuff while this
    // is running, so we need to invalidate their logins first.
    // The user/class references in the rest of the DB tables
    // aren't relational, so this won't prevent the rest of
    // the resources being deleted.
    // delete all students
    let users = await auth0requests.getUsers(auth0token, classid, 0);
    while (users.length > 0) {
        await deleteUsers(classid, users, auth0token);
        users = await auth0requests.getUsers(auth0token, classid, 0);
    }
    // delete the class-wide resources (e.g. Bluemix creds)
    await db.deleteClassResources(classid);
    // The teacher account is deleted last, so that if anything
    // goes wrong, the teacher can try again.
    // If we delete the teacher account first, they won't be able
    // to submit another request, and could potentially be left
    // with some stuff left behind that would be difficult to
    // find/remove.
    // delete the teachers
    const teachers = await auth0requests.getClassSupervisors(auth0token, classid);
    await deleteUsers(classid, teachers, auth0token);
    // Schedule a background task to delete images and sounds
    //  uploaded by students in this class
    await db.storeDeleteClassObjectsJob(classid);
    // remove the class tenant if one exists (most classes won't
    //  have one, unless they've modified the default class definition)
    await db.deleteClassTenant(classid);
    slack.notify('Successfully deleted class "' + classid + '"', slack.SLACK_CHANNELS.CLASS_DELETE);
    emails.deletedClass(classid, teachers);
}
exports.deleteClass = deleteClass;