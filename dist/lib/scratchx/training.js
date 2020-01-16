"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const uuid = require("uuid/v4");
// local dependencies
const store = require("../db/store");
const objectstore = require("../objectstore");
const urlparse = require("../restapi/images/urlparse");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
async function storeText(key, label, textStr) {
    // check that we have some data to store
    if (!textStr || typeof textStr !== 'string' || textStr.trim().length === 0) {
        throw new Error('Missing data');
    }
    const project = await store.getProject(key.projectid);
    // check that this isn't an unknown project
    if (!project) {
        throw new Error('Project not found');
    }
    // check that we have a label that is in the project
    if (project.labels.indexOf(label) === -1) {
        throw new Error('Invalid label');
    }
    // All looks good!
    return store.storeTextTraining(project.id, textStr, label);
}
async function storeNumbers(key, label, numbersStr) {
    // check that we have some data to store
    if (!numbersStr || numbersStr.length === 0) {
        throw new Error('Missing data');
    }
    const project = await store.getProject(key.projectid);
    // check that this isn't an unknown project
    if (!project) {
        throw new Error('Project not found');
    }
    // check that we have the right number of numbers to store
    if (numbersStr.length !== project.numfields) {
        throw new Error('Missing data');
    }
    // check that we have a label that is in the project
    if (project.labels.indexOf(label) === -1) {
        throw new Error('Invalid label');
    }
    // verify that the all the fields are the right type
    const fields = await store.getNumberProjectFields(project.userid, project.classid, project.id);
    const numbers = fields.map((field, idx) => {
        if (field.type === 'multichoice') {
            const asNum = field.choices.indexOf(numbersStr[idx]);
            if (asNum === -1) {
                throw new Error('Invalid data');
            }
            return asNum;
        }
        else { // if (field.type === 'number') {
            const asNum = Number(numbersStr[idx]);
            if (isNaN(asNum)) {
                throw new Error('Invalid data');
            }
            return asNum;
        }
    });
    // All looks good!
    return store.storeNumberTraining(project.id, project.isCrowdSourced, numbers, label);
}
async function storeImages(key, label, base64imagedata) {
    // check image data to store
    if (typeof base64imagedata !== 'string') {
        throw new Error('Invalid data');
    }
    if (!base64imagedata || base64imagedata.trim().length === 0) {
        throw new Error('Missing data');
    }
    // check project
    const project = await store.getProject(key.projectid);
    // check that this isn't an unknown project
    if (!project) {
        throw new Error('Project not found');
    }
    // check that we have a label that is in the project
    if (project.labels.indexOf(label) === -1) {
        throw new Error('Invalid label');
    }
    // All looks good!
    const imageSpec = {
        classid: project.classid,
        userid: project.userid,
        projectid: project.id,
        objectid: uuid(),
    };
    await objectstore.storeImage(imageSpec, 'image/jpeg', Buffer.from(base64imagedata, 'base64'));
    return store.storeImageTraining(imageSpec.projectid, urlparse.createImageUrl(imageSpec), label, true, imageSpec.objectid);
}
async function storeSound(key) {
    log.error({ key }, 'Unexpected request to store sound training data');
    throw new Error('Not implemented yet');
}
function storeTrainingData(scratchKey, label, data) {
    switch (scratchKey.type) {
        case 'text':
            return storeText(scratchKey, label, data);
        case 'numbers': {
            let dataAsArray = data;
            if (data && Array.isArray(dataAsArray) === false) {
                dataAsArray = [data];
            }
            return storeNumbers(scratchKey, label, dataAsArray);
        }
        case 'images':
            return storeImages(scratchKey, label, data);
        case 'sounds':
            return storeSound(scratchKey);
    }
}
exports.storeTrainingData = storeTrainingData;
