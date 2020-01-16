"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const IBMCosSDK = require("ibm-cos-sdk");
// local dependencies
const keys = require("./keys");
const deletes = require("./bulkdelete");
const config = require("./config");
const env = require("../utils/env");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
let cos;
let BUCKET;
let creds;
function init() {
    const bucketString = process.env[env.OBJECT_STORE_BUCKET];
    if (bucketString) {
        BUCKET = bucketString;
    }
    else {
        log.debug('Missing OBJECT_STORE_BUCKET');
    }
    const credsString = process.env[env.OBJECT_STORE_CREDS];
    if (credsString) {
        try {
            creds = JSON.parse(credsString);
        }
        catch (err) {
            throw new Error('Invalid OBJECT_STORE_CREDS');
        }
        cos = new IBMCosSDK.S3(creds);
    }
    else {
        log.debug('Missing OBJECT_STORE_CREDS');
    }
    if (BUCKET && creds) {
        verifyBucket();
    }
}
exports.init = init;
function getCredentials() {
    return {
        bucketid: BUCKET,
        credentials: creds,
    };
}
exports.getCredentials = getCredentials;
async function storeImage(spec, type, contents) {
    const objectDefinition = {
        Bucket: BUCKET,
        Key: keys.get(spec),
        Body: contents,
        Metadata: {
            filetype: type,
        },
    };
    const stored = await cos.putObject(objectDefinition).promise();
    return stored.ETag;
}
exports.storeImage = storeImage;
async function storeSound(spec, contents) {
    const objectDefinition = {
        Bucket: BUCKET,
        Key: keys.get(spec),
        Body: contents.join(','),
    };
    const stored = await cos.putObject(objectDefinition).promise();
    return stored.ETag;
}
exports.storeSound = storeSound;
async function getImage(spec) {
    const objectDefinition = {
        Bucket: BUCKET,
        Key: keys.get(spec),
    };
    const response = await cos.getObject(objectDefinition).promise();
    return getImageObject(objectDefinition.Key, response);
}
exports.getImage = getImage;
async function getSound(spec) {
    const objectDefinition = {
        Bucket: BUCKET,
        Key: keys.get(spec),
    };
    const response = await cos.getObject(objectDefinition).promise();
    return getSoundObject(objectDefinition.Key, response);
}
exports.getSound = getSound;
async function deleteObject(spec) {
    const objectDefinition = {
        Bucket: BUCKET,
        Key: keys.get(spec),
    };
    await cos.deleteObject(objectDefinition).promise();
}
exports.deleteObject = deleteObject;
function deleteProject(spec) {
    return deletes.deleteProject(cos, BUCKET, spec);
}
exports.deleteProject = deleteProject;
function deleteUser(spec) {
    return deletes.deleteUser(cos, BUCKET, spec);
}
exports.deleteUser = deleteUser;
function deleteClass(spec) {
    return deletes.deleteClass(cos, BUCKET, spec);
}
exports.deleteClass = deleteClass;
function getImageType(key, response) {
    if (response.Metadata) {
        if (config.SUPPORTED_IMAGE_MIMETYPES.includes(response.Metadata.filetype)) {
            return response.Metadata.filetype;
        }
        else {
            log.error({ key, filetype: response.Metadata.filetype }, 'Invalid filetype metadata. Setting to empty');
            return '';
        }
    }
    else {
        log.error({ key }, 'Missing filetype metadata. Setting to empty');
        return '';
    }
}
function getImageObject(key, response) {
    return {
        size: response.ContentLength ? response.ContentLength : -1,
        body: response.Body,
        modified: response.LastModified ? response.LastModified.toString() : '',
        etag: response.ETag,
        filetype: getImageType(key, response),
    };
}
function getSoundObject(key, response) {
    return {
        size: response.ContentLength ? response.ContentLength : -1,
        body: getSoundData(response.Body),
        modified: response.LastModified ? response.LastModified.toString() : '',
        etag: response.ETag,
    };
}
function getSoundData(raw) {
    if (raw) {
        return raw.toString().split(',').map((itemstr) => {
            return Number(itemstr);
        });
    }
    return [];
}
function verifyBucket() {
    const req = {
        Bucket: BUCKET,
        MaxKeys: 1,
    };
    cos.listObjects(req, (err /*, output: IBMCosSDK.S3.ListObjectsOutput*/) => {
        if (err) {
            log.error({ err }, 'Unable to query Object Storage');
            throw new Error('Failed to verify Object Store config : ' + err.message);
        }
    });
}
