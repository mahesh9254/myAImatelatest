"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const conversation = require("../training/conversation");
const visualrecog = require("../training/visualrecognition");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
function getStatus(scratchKey) {
    if (!scratchKey.classifierid) {
        return Promise.resolve({
            status: scratchKey.type === 'numbers' ? 2 : 0,
            msg: 'No models trained yet - only random answers can be chosen',
        });
    }
    switch (scratchKey.type) {
        case 'text':
            return getTextClassifierStatus(scratchKey);
        case 'images':
            return getImageClassifierStatus(scratchKey);
        case 'numbers':
            return getNumbersClassifierStatus(scratchKey);
        case 'sounds':
            return getSoundClassifierStatus(scratchKey);
    }
}
exports.getStatus = getStatus;
async function getTextClassifierStatus(scratchKey) {
    if (scratchKey.credentials && scratchKey.classifierid) {
        const credentials = scratchKey.credentials;
        const classifier = {
            id: 'workspaceid',
            name: scratchKey.name,
            workspace_id: scratchKey.classifierid,
            credentialsid: credentials.id,
            created: new Date(),
            expiry: new Date(),
            language: 'en',
            url: scratchKey.credentials.url + '/v1/workspaces/' + scratchKey.classifierid,
        };
        const classifierWithStatus = await conversation.getStatus(credentials, classifier);
        if (classifierWithStatus.status === 'Available') {
            return {
                status: 2,
                msg: 'Ready',
            };
        }
        else if (classifierWithStatus.status === 'Training') {
            return {
                status: 1,
                msg: 'Model not ready yet',
            };
        }
        return {
            status: 0,
            msg: 'Model ' + classifierWithStatus.status,
        };
    }
    return {
        status: 0,
        msg: 'Classifier not found',
    };
}
async function getImageClassifierStatus(scratchKey) {
    if (scratchKey.credentials && scratchKey.classifierid) {
        const credentials = scratchKey.credentials;
        const classifier = {
            id: 'classifierid',
            name: scratchKey.name,
            classifierid: scratchKey.classifierid,
            credentialsid: credentials.id,
            created: new Date(),
            expiry: new Date(),
            url: scratchKey.credentials.url + '/v3/classifiers/' + scratchKey.classifierid,
        };
        const classifierWithStatus = await visualrecog.getStatus(credentials, classifier);
        if (classifierWithStatus.status === 'ready') {
            return {
                status: 2,
                msg: 'Ready',
            };
        }
        else if (classifierWithStatus.status === 'training') {
            return {
                status: 1,
                msg: 'Model not ready yet',
            };
        }
        return {
            status: 0,
            msg: 'Model ' + classifierWithStatus.status,
        };
    }
    return {
        status: 0,
        msg: 'Classifier not found',
    };
}
function getNumbersClassifierStatus(scratchKey) {
    return Promise.resolve({ status: 2, msg: 'Status for ' + scratchKey.name });
}
function getSoundClassifierStatus(scratchKey) {
    log.error({ scratchKey }, 'Unexpected attempt to get status of sound model');
    return Promise.resolve({ status: 0, msg: 'Classifier not found' });
}
