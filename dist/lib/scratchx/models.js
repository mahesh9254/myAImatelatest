"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db = require("../db/store");
const conversation = require("../training/conversation");
const numbers = require("../training/numbers");
async function trainModel(scratchKey) {
    if (scratchKey.type !== 'text' && scratchKey.type !== 'numbers') {
        return Promise.reject(new Error('Only text or numbers models can be trained using a Scratch key'));
    }
    try {
        const project = await db.getProject(scratchKey.projectid);
        if (!project) {
            return Promise.reject(new Error('Project not found'));
        }
        if (project.type === 'text') {
            const model = await conversation.trainClassifier(project);
            if (model.status === 'Training') {
                return {
                    status: 1,
                    msg: 'Model not ready yet',
                };
            }
            else {
                return {
                    status: 0,
                    msg: 'Model ' + model.status,
                };
            }
        }
        else if (project.type === 'numbers') {
            const model = await numbers.trainClassifier(project);
            if (model.status === 'Available') {
                return {
                    status: 2,
                    msg: 'Ready',
                };
            }
            else {
                return {
                    status: 0,
                    msg: 'Model Failed',
                };
            }
        }
        else {
            return Promise.reject(new Error('Only text or numbers models can be trained using a Scratch key'));
        }
    }
    catch (err) {
        return {
            status: 0,
            msg: 'Failed to train machine learning model',
        };
    }
}
exports.trainModel = trainModel;
