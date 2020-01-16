"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEPARATOR = '/';
function get(spec) {
    return [
        spec.classid,
        spec.userid,
        spec.projectid,
        spec.objectid,
    ].join(exports.SEPARATOR);
}
exports.get = get;
function getProjectPrefix(spec) {
    return [
        spec.classid,
        spec.userid,
        spec.projectid,
    ].join(exports.SEPARATOR) + exports.SEPARATOR;
}
exports.getProjectPrefix = getProjectPrefix;
function getUserPrefix(spec) {
    return [
        spec.classid,
        spec.userid,
    ].join(exports.SEPARATOR) + exports.SEPARATOR;
}
exports.getUserPrefix = getUserPrefix;
function getClassPrefix(spec) {
    return [
        spec.classid,
    ].join(exports.SEPARATOR) + exports.SEPARATOR;
}
exports.getClassPrefix = getClassPrefix;
function getProjectIdFromPrefix(projectPrefix) {
    const chunks = projectPrefix.split(exports.SEPARATOR);
    return chunks[chunks.length - 2];
}
exports.getProjectIdFromPrefix = getProjectIdFromPrefix;
function getUserIdFromPrefix(userPrefix) {
    const chunks = userPrefix.split(exports.SEPARATOR);
    return chunks[chunks.length - 2];
}
exports.getUserIdFromPrefix = getUserIdFromPrefix;
