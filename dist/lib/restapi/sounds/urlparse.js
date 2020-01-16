"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const urls = require("../../restapi/urls");
function soundUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
        projectid: req.params.projectid,
        objectid: req.params.soundid,
    };
}
exports.soundUrl = soundUrl;
function soundsUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
        projectid: req.params.projectid,
        objectid: uuid(),
    };
}
exports.soundsUrl = soundsUrl;
// export function projectUrl(req: Express.Request): Types.ProjectSpec {
//     return {
//         classid : req.params.classid,
//         userid : req.params.studentid,
//         projectid : req.params.projectid,
//     };
// }
// export function userUrl(req: Express.Request): Types.UserSpec {
//     return {
//         classid : req.params.classid,
//         userid : req.params.studentid,
//     };
// }
// export function classUrl(req: Express.Request): Types.ClassSpec {
//     return {
//         classid : req.params.classid,
//     };
// }
function createSoundUrl(params) {
    return urls.SOUND
        .replace(':classid', params.classid)
        .replace(':studentid', params.userid)
        .replace(':projectid', params.projectid)
        .replace(':soundid', params.objectid);
}
exports.createSoundUrl = createSoundUrl;
