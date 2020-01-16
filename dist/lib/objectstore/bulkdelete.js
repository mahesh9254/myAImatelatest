"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const keys = require("./keys");
async function deleteProject(cos, bucket, project) {
    const req = {
        Bucket: bucket,
        Prefix: keys.getProjectPrefix(project),
        Delimiter: keys.SEPARATOR,
    };
    let imageKeys = await getObjectKeys(cos, req);
    do {
        await bulkDelete(cos, bucket, imageKeys);
        imageKeys = await getObjectKeys(cos, req);
    } while (imageKeys.length > 0);
}
exports.deleteProject = deleteProject;
async function deleteUser(cos, bucket, user) {
    const projectPrefixes = await getProjectPrefixes(cos, bucket, user);
    const deletePromises = projectPrefixes.map((projectPrefix) => {
        const project = {
            classid: user.classid,
            userid: user.userid,
            projectid: keys.getProjectIdFromPrefix(projectPrefix),
        };
        return deleteProject(cos, bucket, project);
    });
    await Promise.all(deletePromises);
}
exports.deleteUser = deleteUser;
async function deleteClass(cos, bucket, clazz) {
    const userPrefixes = await getUserPrefixes(cos, bucket, clazz);
    const deletePromises = userPrefixes.map((userPrefix) => {
        const user = {
            classid: clazz.classid,
            userid: keys.getUserIdFromPrefix(userPrefix),
        };
        return deleteUser(cos, bucket, user);
    });
    await Promise.all(deletePromises);
}
exports.deleteClass = deleteClass;
function getPrefixes(commonPrefixes) {
    if (commonPrefixes) {
        return commonPrefixes
            .filter(notEmpty)
            .map((prefix) => {
            return prefix.Prefix;
        })
            .filter(notEmpty);
    }
    else {
        return [];
    }
}
async function getProjectPrefixes(cos, bucket, spec) {
    const projectsOutput = await cos.listObjects({
        Bucket: bucket,
        Prefix: keys.getUserPrefix(spec),
        Delimiter: keys.SEPARATOR,
    }).promise();
    return getPrefixes(projectsOutput.CommonPrefixes);
}
async function getUserPrefixes(cos, bucket, spec) {
    const usersOutput = await cos.listObjects({
        Bucket: bucket,
        Prefix: keys.getClassPrefix(spec),
        Delimiter: keys.SEPARATOR,
    }).promise();
    return getPrefixes(usersOutput.CommonPrefixes);
}
function bulkDelete(cos, bucket, imageKeys) {
    return Promise.all(imageKeys.map((imagekey) => {
        return cos.deleteObject({
            Bucket: bucket,
            Key: imagekey,
        }).promise();
    }));
}
function getObjectKeys(cos, req) {
    return cos.listObjects(req).promise()
        .then((response) => {
        return response.Contents;
    })
        .then((contents) => {
        if (contents) {
            return contents.map((content) => {
                return content.Key;
            });
        }
        else {
            return [];
        }
    })
        .then((imageKeys) => {
        return imageKeys.filter(notEmpty);
    });
}
function notEmpty(value) {
    return value !== null && value !== undefined;
}
