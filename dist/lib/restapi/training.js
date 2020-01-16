"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpstatus = require("http-status");
const rangeParse = require("http-range-parse");
// local dependencies
const auth = require("./auth");
const store = require("../db/store");
const urls = require("./urls");
const errors = require("./errors");
const headers = require("./headers");
const visrec = require("../training/visualrecognition");
const imageCheck = require("../utils/imageCheck");
const imageDownload = require("../utils/download");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
function getPagingOptions(req) {
    let start = 0;
    let limit = 50;
    try {
        const rangeStr = req.header('range');
        if (rangeStr) {
            const range = rangeParse(rangeStr);
            if (range && range.unit === 'items') {
                start = range.first;
                limit = range.last - start + 1;
                limit = isNaN(limit) === false && limit > 0 ? limit : 0;
            }
        }
    }
    catch (err) {
        log.error({ err }, 'Failed to parse paging options');
    }
    return { start, limit };
}
function generatePagingResponse(start, items, count) {
    return 'items ' + start + '-' + (start + items.length - 1) + '/' + count;
}
async function getTraining(req, res) {
    const options = getPagingOptions(req);
    try {
        let training = [];
        const count = await store.countTraining(req.project.type, req.project.id);
        switch (req.project.type) {
            case 'text':
                training = await store.getTextTraining(req.project.id, options);
                break;
            case 'numbers':
                training = await store.getNumberTraining(req.project.id, options);
                break;
            case 'images':
                training = await store.getImageTraining(req.project.id, options);
                break;
            case 'sounds':
                training = await store.getSoundTraining(req.project.id, options);
                break;
        }
        res.set('Content-Range', generatePagingResponse(options.start, training, count));
        res.set(headers.NO_CACHE);
        res.json(training);
    }
    catch (err) {
        errors.unknownError(res, err);
    }
}
async function getLabels(req, res) {
    try {
        const counts = await store.countTrainingByLabel(req.project);
        const labelCounts = {};
        for (const label of req.project.labels) {
            labelCounts[label] = (label in counts) ? counts[label] : 0;
        }
        res.set(headers.NO_CACHE).json(labelCounts);
    }
    catch (err) {
        errors.unknownError(res, err);
    }
}
function editLabel(req, res) {
    const before = req.body.before;
    const after = req.body.after;
    if (!before || !after) {
        return errors.missingData(res);
    }
    return store.renameTrainingLabel(req.project.type, req.project.id, before, after)
        .then(() => {
        res.sendStatus(httpstatus.OK);
    })
        .catch((err) => {
        errors.unknownError(res, err);
    });
}
async function deleteTraining(req, res) {
    const trainingid = req.params.trainingid;
    if (req.project.type === 'images') {
        const inImageStore = await store.isImageStored(trainingid);
        if (inImageStore) {
            store.storeDeleteObjectJob(req.params.classid, req.params.studentid, req.params.projectid, trainingid);
        }
    }
    else if (req.project.type === 'sounds') {
        store.storeDeleteObjectJob(req.params.classid, req.params.studentid, req.params.projectid, trainingid);
    }
    return store.deleteTraining(req.project.type, req.project.id, trainingid)
        .then(() => {
        res.sendStatus(httpstatus.NO_CONTENT);
    })
        .catch((err) => {
        errors.unknownError(res, err);
    });
}
async function storeTraining(req, res) {
    try {
        const data = req.body.data;
        const label = req.body.label;
        if (!data) {
            return errors.missingData(res);
        }
        let training;
        switch (req.project.type) {
            case 'text':
                training = await store.storeTextTraining(req.project.id, data, label);
                break;
            case 'numbers':
                if (!Array.isArray(data) || data.length !== req.project.numfields) {
                    return errors.missingData(res);
                }
                training = await store.storeNumberTraining(req.project.id, req.project.isCrowdSourced, data, label);
                break;
            case 'images':
                await imageCheck.verifyImage(data, visrec.getMaxImageFileSize());
                training = await store.storeImageTraining(req.project.id, data, label, false);
                break;
            case 'sounds':
                // should be uploaded via the object store URL
                return errors.notImplemented(res);
        }
        res.status(httpstatus.CREATED).json(training);
    }
    catch (err) {
        if (err.message && typeof err.message === 'string' &&
            (err.message === 'Text exceeds maximum allowed length (1024 characters)' ||
                err.message === 'Empty text is not allowed' ||
                err.message === 'Number of data items exceeded maximum' ||
                err.message === 'Data contains non-numeric items' ||
                err.message === 'Number is too small' ||
                err.message === 'Number is too big' ||
                err.message === 'Missing required attributes' ||
                err.message.startsWith(imageCheck.ERROR_PREFIXES.BAD_TYPE) ||
                err.message.startsWith('Unable to download image from ') ||
                err.message.startsWith(imageCheck.ERROR_PREFIXES.TOO_BIG) ||
                err.message.includes(imageDownload.ERRORS.DOWNLOAD_FORBIDDEN))) {
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        else if (err.message === 'Project already has maximum allowed amount of training data') {
            return res.status(httpstatus.CONFLICT).json({ error: err.message });
        }
        errors.unknownError(res, err);
    }
}
function registerApis(app) {
    app.get(urls.TRAININGITEMS, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, 
    // @ts-ignore
    getTraining);
    app.get(urls.LABELS, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, 
    // @ts-ignore
    getLabels);
    app.put(urls.LABELS, auth.authenticate, auth.checkValidUser, auth.verifyProjectOwner, 
    // @ts-ignore
    editLabel);
    app.delete(urls.TRAININGITEM, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, 
    // @ts-ignore
    deleteTraining);
    app.post(urls.TRAININGITEMS, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, 
    // @ts-ignore
    storeTraining);
}
exports.default = registerApis;
