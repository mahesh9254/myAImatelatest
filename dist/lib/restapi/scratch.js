"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpstatus = require("http-status");
// local dependencies
const store = require("../db/store");
const objectstore = require("../objectstore");
const errors = require("./errors");
const auth = require("./auth");
const extensions = require("../scratchx/extensions");
const models = require("../scratchx/models");
const status = require("../scratchx/status");
const keys = require("../scratchx/keys");
const classifier = require("../scratchx/classify");
const training = require("../scratchx/training");
const conversation = require("../training/conversation");
const urls = require("./urls");
const headers = require("./headers");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
async function getScratchKeys(req, res) {
    const classid = req.params.classid;
    const userid = req.params.studentid;
    const projectid = req.params.projectid;
    try {
        const scratchKeys = await store.findScratchKeys(userid, projectid, classid);
        if (scratchKeys.length === 0) {
            const newKeyInfo = await keys.createKey(projectid);
            return res.set(headers.NO_CACHE).json([newKeyInfo]);
        }
        return res.set(headers.NO_CACHE).json(scratchKeys.map((key) => {
            return {
                id: key.id,
                model: key.classifierid,
            };
        }));
    }
    catch (err) {
        log.error({ err }, 'Failed to get keys');
        errors.unknownError(res, err);
    }
}
async function classifyWithScratchKey(req, res) {
    const apikey = req.params.scratchkey;
    try {
        if (!req.query.data) {
            log.warn({
                agent: req.header('X-User-Agent'),
                key: apikey,
                func: 'classifyWithScratchKey',
            }, 'Missing data');
            throw new Error('Missing data');
        }
        const scratchKey = await store.getScratchKey(apikey);
        if (req.header('if-modified-since') &&
            scratchKey.updated &&
            scratchKey.updated.toISOString() === req.header('if-modified-since')) {
            return res.sendStatus(httpstatus.NOT_MODIFIED);
        }
        const classes = await classifier.classify(scratchKey, req.query.data);
        return res.set(headers.CACHE_10SECONDS).jsonp(classes);
    }
    catch (err) {
        if (err.message === 'Missing data') {
            return res.status(httpstatus.BAD_REQUEST).jsonp({ error: 'Missing data' });
        }
        if (err.message === conversation.ERROR_MESSAGES.TEXT_TOO_LONG) {
            return res.status(httpstatus.BAD_REQUEST).jsonp({ error: err.message });
        }
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).jsonp({ error: 'Scratch key not found' });
        }
        if (err.statusCode === httpstatus.BAD_REQUEST) {
            return res.status(httpstatus.BAD_REQUEST).jsonp({ error: err.message });
        }
        const safeDataDebug = typeof req.query.data === 'string' ?
            req.query.data.substr(0, 100) :
            typeof req.query.data;
        log.error({ err, data: safeDataDebug, agent: req.header('X-User-Agent') }, 'Classify error (get)');
        return res.status(httpstatus.INTERNAL_SERVER_ERROR).jsonp(err);
    }
}
async function postClassifyWithScratchKey(req, res) {
    const apikey = req.params.scratchkey;
    try {
        if (!req.body.data) {
            log.warn({
                agent: req.header('X-User-Agent'),
                key: apikey,
                func: 'postClassifyWithScratchKey',
            }, 'Missing data');
            throw new Error('Missing data');
        }
        const scratchKey = await store.getScratchKey(apikey);
        if (req.header('if-modified-since') &&
            scratchKey.updated &&
            scratchKey.updated.toISOString() === req.header('if-modified-since')) {
            return res.sendStatus(httpstatus.NOT_MODIFIED);
        }
        const classes = await classifier.classify(scratchKey, req.body.data);
        return res.json(classes);
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).json({ error: 'Scratch key not found' });
        }
        if (err.message === conversation.ERROR_MESSAGES.TEXT_TOO_LONG) {
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        if (err.statusCode === httpstatus.BAD_REQUEST) {
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        if (err.statusCode === httpstatus.FORBIDDEN || err.statusCode === httpstatus.UNAUTHORIZED) {
            return res.status(httpstatus.CONFLICT).json({ error: 'The Watson credentials being used by your class were rejected.' });
        }
        const safeDataDebug = typeof req.body.data === 'string' ?
            req.body.data.substr(0, 100) :
            typeof req.body.data;
        if (err.message === 'Missing data' ||
            err.message === 'Invalid image data provided. Remember, only jpg and png images are supported.') {
            log.warn({
                agent: req.header('X-User-Agent'),
                displayedHelp: req.body.displayedhelp,
                data: safeDataDebug,
            }, 'Missing data in Scratch key classification');
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        log.error({ err, data: safeDataDebug, agent: req.header('X-User-Agent') }, 'Classify error (post)');
        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json(err);
    }
}
function getSoundTrainingItem(info) {
    const urlSegments = info.audiourl.split('/');
    if (urlSegments.length < 10) {
        throw new Error('Unexpected audio url');
    }
    const soundSpec = {
        classid: urlSegments[3],
        userid: urlSegments[5],
        projectid: urlSegments[7],
        objectid: urlSegments[9],
    };
    return objectstore.getSound(soundSpec)
        .then((audiodata) => {
        const soundTraining = info;
        soundTraining.audiodata = audiodata.body;
        return soundTraining;
    });
}
async function getTrainingData(req, res) {
    const apikey = req.params.scratchkey;
    try {
        const scratchKey = await store.getScratchKey(apikey);
        if (scratchKey.type !== 'sounds') {
            return res.status(httpstatus.METHOD_NOT_ALLOWED)
                .json({
                error: 'Method not allowed',
            });
        }
        const trainingInfo = await store.getSoundTraining(scratchKey.projectid, {
            start: 0,
            limit: 100,
        });
        const trainingData = await Promise.all(trainingInfo.map(getSoundTrainingItem));
        res.set(headers.CACHE_2MINUTES);
        return res.json(trainingData);
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).json({ error: 'Scratch key not found' });
        }
        log.error({ err, agent: req.header('X-User-Agent') }, 'Fetch error');
        return res.status(httpstatus.INTERNAL_SERVER_ERROR).jsonp(err);
    }
}
async function storeTrainingData(req, res) {
    const apikey = req.params.scratchkey;
    try {
        if (!req.body.data || !req.body.label) {
            log.warn({
                agent: req.header('X-User-Agent'),
                key: apikey,
                func: 'postStoreTrainingData',
            }, 'Missing data');
            throw new Error('Missing data');
        }
        const scratchKey = await store.getScratchKey(apikey);
        const stored = await training.storeTrainingData(scratchKey, req.body.label, req.body.data);
        return res.set(headers.NO_CACHE).json(stored);
    }
    catch (err) {
        if (err.message === 'Missing data' ||
            err.message === 'Invalid data' ||
            err.message === 'Invalid label' ||
            err.message === 'Number is too small' ||
            err.message === 'Number is too big') {
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        if (err.message === 'Project already has maximum allowed amount of training data') {
            return res.status(httpstatus.CONFLICT).json({ error: err.message });
        }
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).json({ error: 'Scratch key not found' });
        }
        log.error({ err, datatype: typeof (req.body.data), agent: req.header('X-User-Agent') }, 'Store error');
        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json(err);
    }
}
async function getExtension(req, res, version) {
    const apikey = req.params.scratchkey;
    try {
        const scratchKey = await store.getScratchKey(apikey);
        const project = await store.getProject(scratchKey.projectid);
        if (!project) {
            return errors.notFound(res);
        }
        if (project.type === 'numbers') {
            project.fields = await store.getNumberProjectFields(project.userid, project.classid, project.id);
        }
        const extension = await extensions.getScratchxExtension(scratchKey, project, version);
        return res.set('Content-Type', 'application/javascript')
            .set(headers.NO_CACHE)
            .send(extension);
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).json({ error: 'Scratch key not found' });
        }
        log.error({ err }, 'Failed to generate extension');
        errors.unknownError(res, err);
    }
}
function getScratchxExtension(req, res) {
    getExtension(req, res, 2);
}
function getScratch3Extension(req, res) {
    getExtension(req, res, 3);
}
async function getScratchxStatus(req, res) {
    const apikey = req.params.scratchkey;
    try {
        const scratchKey = await store.getScratchKey(apikey);
        const scratchStatus = await status.getStatus(scratchKey);
        return res.set(headers.NO_CACHE).jsonp(scratchStatus);
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving credentials for Scratch') {
            return res.status(httpstatus.NOT_FOUND).jsonp({ error: 'Scratch key not found' });
        }
        log.error({ err, agent: req.header('X-User-Agent') }, 'Status error');
        errors.unknownError(res, err);
    }
}
async function trainNewClassifier(req, res) {
    const apikey = req.params.scratchkey;
    try {
        const scratchKey = await store.getScratchKey(apikey);
        const classifierStatus = await models.trainModel(scratchKey);
        return res.set(headers.NO_CACHE).jsonp(classifierStatus);
    }
    catch (err) {
        if (err.message === 'Only text or numbers models can be trained using a Scratch key') {
            return res.status(httpstatus.NOT_IMPLEMENTED).json({ error: err.message });
        }
        log.error({ err, agent: req.header('X-User-Agent') }, 'Train error');
        errors.unknownError(res, err);
    }
}
function registerApis(app) {
    app.get(urls.SCRATCHKEYS, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, getScratchKeys);
    app.get(urls.SCRATCHKEY_CLASSIFY, classifyWithScratchKey);
    app.post(urls.SCRATCHKEY_CLASSIFY, postClassifyWithScratchKey);
    app.post(urls.SCRATCHKEY_MODEL, trainNewClassifier);
    app.get(urls.SCRATCHKEY_TRAIN, getTrainingData);
    app.post(urls.SCRATCHKEY_TRAIN, storeTrainingData);
    app.get(urls.SCRATCHKEY_EXTENSION, getScratchxExtension);
    app.get(urls.SCRATCH3_EXTENSION, getScratch3Extension);
    app.get(urls.SCRATCHKEY_STATUS, getScratchxStatus);
}
exports.default = registerApis;
