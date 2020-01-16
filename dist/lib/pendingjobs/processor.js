"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const objectstore = require("../objectstore");
const logger_1 = require("../utils/logger");
const Types = require("../db/db-types");
const log = logger_1.default();
function fail(spec, expected) {
    log.error({ spec, expected }, 'Unexpected pending job data');
    return new Error('Missing required info in pending job');
}
function getObjectSpec(spec) {
    const check = spec;
    if (check.classid &&
        check.userid &&
        check.projectid &&
        check.objectid) {
        return check;
    }
    throw fail(spec, 'ImageSpec');
}
function getProjectSpec(spec) {
    const check = spec;
    if (check.classid &&
        check.userid &&
        check.projectid) {
        return check;
    }
    throw fail(spec, 'ProjectSpec');
}
function getUserSpec(spec) {
    const check = spec;
    if (check.classid &&
        check.userid) {
        return check;
    }
    throw fail(spec, 'UserSpec');
}
function getClassSpec(spec) {
    const check = spec;
    if (check.classid) {
        return check;
    }
    throw fail(spec, 'ClassSpec');
}
function processJob(job) {
    switch (job.jobtype) {
        case Types.PendingJobType.DeleteOneObjectFromObjectStorage:
            return objectstore.deleteObject(getObjectSpec(job.jobdata));
        case Types.PendingJobType.DeleteProjectObjectsFromObjectStorage:
            return objectstore.deleteProject(getProjectSpec(job.jobdata));
        case Types.PendingJobType.DeleteUserObjectsFromObjectStorage:
            return objectstore.deleteUser(getUserSpec(job.jobdata));
        case Types.PendingJobType.DeleteClassObjectsFromObjectStorage:
            return objectstore.deleteClass(getClassSpec(job.jobdata));
        default:
            log.error({ job }, 'Unrecognised pending job type');
            throw new Error('Unrecognised pending job type');
    }
}
exports.processJob = processJob;
