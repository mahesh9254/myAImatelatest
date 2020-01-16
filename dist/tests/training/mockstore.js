"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DbObjects = require("../../lib/db/objects");
exports.creds = {
    id: '123',
    username: 'useruseruseruseruseruseruseruseruser',
    password: 'passpasspass',
    servicetype: 'conv',
    url: 'http://conversation.service',
    classid: 'classid',
    credstype: 'conv_lite',
};
exports.credsForVisRec = {
    id: '456',
    username: 'user',
    password: 'pass',
    servicetype: 'visrec',
    url: 'https://gateway-a.watsonplatform.net/visual-recognition/api',
    classid: 'classid',
    credstype: 'visrec_lite',
};
function getBluemixCredentials(classid, service) {
    if (service === 'conv') {
        return new Promise((resolve) => resolve([exports.creds]));
    }
    else if (service === 'visrec') {
        return new Promise((resolve) => resolve([exports.credsForVisRec]));
    }
    return new Promise((resolve) => resolve([]));
}
exports.getBluemixCredentials = getBluemixCredentials;
function getBluemixCredentialsById(id) {
    return new Promise((resolve, reject) => {
        if (id === '123') {
            return resolve(exports.creds);
        }
        else if (id === '456') {
            return resolve(exports.credsForVisRec);
        }
        else {
            return reject(new Error('Unexpected response when retrieving service credentials'));
        }
    });
}
exports.getBluemixCredentialsById = getBluemixCredentialsById;
const NUM_TRAINING_PER_LABEL = {
    temperature: 18,
    conditions: 16,
};
const NUM_IMAGES_TRAINING_PER_LABEL = {
    rock: 12, paper: 11,
};
const NUM_IMAGES_TRAINING_TINY = {
    rock: 2, paper: 3,
};
const NUM_IMAGES_TRAINING_MASSIVE = {
    rock: 20000, paper: 25000,
};
function countTrainingByLabel(project) {
    if (project.id === 'projectbob' || project.id === 'existingprojectid') {
        return new Promise((resolve) => resolve(NUM_TRAINING_PER_LABEL));
    }
    else if (project.id === 'projectbobvis' || project.id === 'projectbobvislim') {
        return new Promise((resolve) => resolve(NUM_IMAGES_TRAINING_PER_LABEL));
    }
    else if (project.id === 'tinyvis') {
        return new Promise((resolve) => resolve(NUM_IMAGES_TRAINING_TINY));
    }
    else if (project.id === 'massivevis') {
        return new Promise((resolve) => resolve(NUM_IMAGES_TRAINING_MASSIVE));
    }
    else {
        return new Promise((resolve) => resolve({}));
    }
}
exports.countTrainingByLabel = countTrainingByLabel;
function getUniqueTrainingTextsByLabel(projectid, label, options) {
    const start = options.start;
    const limit = options.limit;
    const end = Math.min(start + limit, NUM_TRAINING_PER_LABEL[label]);
    const training = [];
    for (let idx = start; idx < end; idx++) {
        training.push('sample text ' + idx);
    }
    return new Promise((resolve) => resolve(training));
}
exports.getUniqueTrainingTextsByLabel = getUniqueTrainingTextsByLabel;
function getImageTrainingByLabel(projectid, label, options) {
    const start = options.start;
    const limit = options.limit;
    let end;
    if (projectid === 'projectbobvis' || projectid === 'projectbobvislim') {
        end = Math.min(start + limit, NUM_IMAGES_TRAINING_PER_LABEL[label]);
    }
    else if (projectid === 'tinyvis') {
        end = Math.min(start + limit, NUM_IMAGES_TRAINING_TINY[label]);
    }
    else if (projectid === 'massivevis') {
        end = Math.min(start + limit, NUM_IMAGES_TRAINING_MASSIVE[label]);
    }
    else {
        throw new Error('Unexpected project id');
    }
    const training = [];
    for (let idx = start; idx < end; idx++) {
        const item = {
            imageurl: 'http://some-website.com/' + label + '-' + idx + '.jpg',
        };
        training.push(item);
    }
    return new Promise((resolve) => resolve(training));
}
exports.getImageTrainingByLabel = getImageTrainingByLabel;
function storeConversationWorkspace(credentials, project, classifier) {
    return new Promise((resolve) => resolve(DbObjects.getWorkspaceFromDbRow(DbObjects.createConversationWorkspace(classifier, credentials, project))));
}
exports.storeConversationWorkspace = storeConversationWorkspace;
function storeImageClassifier(credentials, project, classifier) {
    return new Promise((resolve) => resolve(DbObjects.createVisualClassifier(classifier, credentials, project)));
}
exports.storeImageClassifier = storeImageClassifier;
function updateConversationWorkspaceExpiry() {
    return Promise.resolve();
}
exports.updateConversationWorkspaceExpiry = updateConversationWorkspaceExpiry;
function getConversationWorkspaces(projectid) {
    return new Promise((resolve) => {
        if (projectid === 'existingprojectid') {
            return resolve([
                {
                    id: 'existingworkspacedbid',
                    workspace_id: 'existing-classifier',
                    credentialsid: '123',
                    url: 'http://conversation.service/v1/workspaces/existing-classifier',
                    name: 'existing',
                    language: 'de',
                    created: new Date(),
                    expiry: new Date(),
                },
            ]);
        }
        resolve([]);
    });
}
exports.getConversationWorkspaces = getConversationWorkspaces;
function getImageClassifiers() {
    return Promise.resolve([]);
}
exports.getImageClassifiers = getImageClassifiers;
function deleteConversationWorkspace() {
    return Promise.resolve();
}
exports.deleteConversationWorkspace = deleteConversationWorkspace;
function deleteImageClassifier() {
    return Promise.resolve();
}
exports.deleteImageClassifier = deleteImageClassifier;
function storeOrUpdateScratchKey() {
    return Promise.resolve('');
}
exports.storeOrUpdateScratchKey = storeOrUpdateScratchKey;
function updateScratchKeyTimestamp() {
    return Promise.resolve();
}
exports.updateScratchKeyTimestamp = updateScratchKeyTimestamp;
function resetExpiredScratchKey() {
    return Promise.resolve();
}
exports.resetExpiredScratchKey = resetExpiredScratchKey;
function getClassTenant(classid) {
    const placeholder = {
        id: classid,
        supportedProjectTypes: ['text', 'images'],
        maxUsers: 8,
        maxProjectsPerUser: 3,
        textClassifierExpiry: 2,
        imageClassifierExpiry: 3,
        isManaged: false,
    };
    return Promise.resolve(placeholder);
}
exports.getClassTenant = getClassTenant;
function getProject(projectid) {
    if (projectid === 'projectbob') {
        return new Promise((resolve) => resolve({
            id: projectid,
            name: 'projectname',
            userid: 'userid',
            classid: 'classid',
            type: 'text',
            language: 'en',
            labels: ['temperature', 'conditions'],
            numfields: 0,
            isCrowdSourced: false,
        }));
    }
    else if (projectid === 'projectbobvis' ||
        projectid === 'projectbobvislim' ||
        projectid === 'tinyvis' ||
        projectid === 'massivevis') {
        return new Promise((resolve) => resolve({
            id: projectid,
            name: 'projectname',
            userid: 'userid',
            classid: 'classid',
            type: 'images',
            language: 'en',
            labels: ['rock', 'paper'],
            numfields: 0,
            isCrowdSourced: false,
        }));
    }
    else if (projectid === 'existingprojectid') {
        return new Promise((resolve) => resolve({
            id: projectid,
            name: 'existing',
            userid: 'userid',
            classid: 'classid',
            type: 'text',
            language: 'de',
            labels: ['temperature', 'conditions'],
            numfields: 0,
            isCrowdSourced: false,
        }));
    }
    throw new Error('Unexpected project id');
}
exports.getProject = getProject;
