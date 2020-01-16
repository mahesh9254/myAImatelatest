"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const urls = require("../../restapi/urls");
function imageUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
        projectid: req.params.projectid,
        objectid: req.params.imageid,
    };
}
exports.imageUrl = imageUrl;
function imagesUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
        projectid: req.params.projectid,
        objectid: uuid(),
    };
}
exports.imagesUrl = imagesUrl;
function projectUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
        projectid: req.params.projectid,
    };
}
exports.projectUrl = projectUrl;
function userUrl(req) {
    return {
        classid: req.params.classid,
        userid: req.params.studentid,
    };
}
exports.userUrl = userUrl;
function classUrl(req) {
    return {
        classid: req.params.classid,
    };
}
exports.classUrl = classUrl;
function createImageUrl(params) {
    return urls.IMAGE
        .replace(':classid', params.classid)
        .replace(':studentid', params.userid)
        .replace(':projectid', params.projectid)
        .replace(':imageid', params.objectid);
}
exports.createImageUrl = createImageUrl;
