"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const store = require("../db/store");
async function createTextKey(project) {
    const textClassifiers = await store.getConversationWorkspaces(project.id);
    if (textClassifiers.length === 0) {
        const id = await store.storeUntrainedScratchKey(project);
        return { id };
    }
    else {
        const classifier = textClassifiers[0];
        const model = classifier.workspace_id;
        const credentials = await store.getBluemixCredentialsById(classifier.credentialsid);
        const id = await store.storeOrUpdateScratchKey(project, credentials, classifier.workspace_id, classifier.created);
        return { id, model };
    }
}
async function createImagesKey(project) {
    const imageClassifiers = await store.getImageClassifiers(project.id);
    if (imageClassifiers.length === 0) {
        const id = await store.storeUntrainedScratchKey(project);
        return { id };
    }
    else {
        const classifier = imageClassifiers[0];
        const model = classifier.classifierid;
        const credentials = await store.getBluemixCredentialsById(classifier.credentialsid);
        const id = await store.storeOrUpdateScratchKey(project, credentials, classifier.classifierid, classifier.created);
        return { id, model };
    }
}
async function createNumbersKey(project) {
    const numClassifiers = await store.getNumbersClassifiers(project.id);
    if (numClassifiers.length === 0) {
        const id = await store.storeUntrainedScratchKey(project);
        return { id };
    }
    else {
        const credentials = {
            servicetype: 'num',
            id: 'NOTUSED',
            url: 'tenantid=' + project.classid + '&' +
                'studentid=' + project.userid + '&' +
                'projectid=' + project.id,
            username: project.userid,
            password: project.classid,
            classid: project.classid,
            credstype: 'unknown',
        };
        const classifier = numClassifiers[0];
        const id = await store.storeOrUpdateScratchKey(project, credentials, project.id, classifier.created);
        return { id, model: project.id };
    }
}
async function createSoundKey(project) {
    const id = await store.storeUntrainedScratchKey(project);
    return { id };
}
async function createKey(projectid) {
    const project = await store.getProject(projectid);
    if (!project) {
        throw new Error('Project not found');
    }
    switch (project.type) {
        case 'text':
            return createTextKey(project);
        case 'images':
            return createImagesKey(project);
        case 'numbers':
            return createNumbersKey(project);
        case 'sounds':
            return createSoundKey(project);
    }
}
exports.createKey = createKey;
