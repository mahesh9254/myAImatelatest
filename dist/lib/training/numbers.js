"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const request = require("request-promise");
const httpStatus = require("http-status");
// local dependencies
const store = require("../db/store");
const openwhisk = require("../utils/openwhisk");
const env = require("../utils/env");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
async function trainClassifier(project) {
    let status;
    try {
        // create a new classifier
        const data = await fetchTraining(project);
        if (data.length === 0) {
            // no training data available to train a classifier
            return {
                created: new Date(),
                status: 'Failed',
                classifierid: '',
            };
        }
        await submitTraining(project.classid, project.userid, project.id, data);
        status = 'Available';
    }
    catch (err) {
        status = 'Failed';
    }
    // misusing the Bluemix creds structure to store what we need
    //  to use the numbers service
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
    // write details about the new classifier to the DB
    const storedClassifier = await store.storeNumbersClassifier(project.userid, project.classid, project.id, status);
    if (status === 'Available') {
        const classifierid = project.id;
        await store.storeOrUpdateScratchKey(project, credentials, classifierid, storedClassifier.created);
    }
    return storedClassifier;
}
exports.trainClassifier = trainClassifier;
async function testClassifier(studentid, tenantid, classifierTimestamp, projectid, data) {
    const fieldsInfo = await store.getNumberProjectFields(studentid, tenantid, projectid);
    const req = {
        auth: {
            user: process.env[env.NUMBERS_SERVICE_USER],
            pass: process.env[env.NUMBERS_SERVICE_PASS],
        },
        body: {
            tenantid, studentid, projectid,
            data: prepareDataObject(fieldsInfo, data),
        },
        json: true,
        gzip: true,
    };
    const url = process.env[env.NUMBERS_SERVICE] + '/api/classify';
    let body;
    try {
        body = await request.post(url, req);
    }
    catch (err) {
        if (err.statusCode === httpStatus.NOT_FOUND) {
            // no ML model found, so try to train one now
            //  and then try the call again
            const project = await store.getProject(projectid);
            if (!project) {
                throw new Error('Project not found');
            }
            const classifier = await trainClassifier(project);
            if (classifier.status === 'Available') {
                body = await request.post(url, req);
            }
            else {
                log.error({ classifier, projectid }, 'Failed to create missing classifier for test');
                throw new Error('Failed to create classifier');
            }
        }
        else if (err.statusCode === httpStatus.INTERNAL_SERVER_ERROR &&
            err.message.includes("Input contains NaN, infinity or a value too large for dtype('float32')")) {
            log.error({ err, data }, 'Value provided outside of valid range?');
            throw err;
        }
        else {
            throw err;
        }
    }
    return Object.keys(body)
        .map((key) => {
        return {
            class_name: key,
            confidence: body[key],
            classifierTimestamp,
        };
    })
        .sort(confidenceSort);
}
exports.testClassifier = testClassifier;
async function deleteClassifier(studentid, tenantid, projectid) {
    const req = {
        auth: {
            user: process.env[env.NUMBERS_SERVICE_USER],
            pass: process.env[env.NUMBERS_SERVICE_PASS],
        },
        qs: { tenantid, studentid, projectid },
        json: true,
    };
    const url = process.env[env.NUMBERS_SERVICE] + '/api/models';
    await request.delete(url, req);
}
exports.deleteClassifier = deleteClassifier;
function confidenceSort(a, b) {
    return b.confidence - a.confidence;
}
async function submitTraining(tenantid, studentid, projectid, data) {
    const req = {
        auth: {
            user: process.env[env.NUMBERS_SERVICE_USER],
            pass: process.env[env.NUMBERS_SERVICE_PASS],
        },
        body: {
            tenantid, studentid, projectid, data,
        },
        json: true,
        gzip: true,
    };
    const url = process.env[env.NUMBERS_SERVICE] + '/api/models';
    try {
        await request.post(url, req);
    }
    catch (err) {
        log.error({ req, err, tenantid, projectid }, 'Failed to train numbers classifier');
        // The full error object will include information about the
        //  internal numbers service which we don't want to return
        //  to clients/users.
        throw new Error('Failed to train classifier');
    }
}
function prepareDataObject(fields, dataitems) {
    const trainingObj = {};
    fields.forEach((field, fieldPos) => {
        const num = dataitems[fieldPos];
        if (field.type === 'multichoice' && field.choices[num]) {
            trainingObj[field.name] = field.choices[num];
        }
        else {
            if (num < -3.4028235e+38) {
                const tooSmall = new Error('Value (' + num + ') is too small');
                tooSmall.statusCode = httpStatus.BAD_REQUEST;
                throw tooSmall;
            }
            if (num > 3.4028235e+38) {
                const tooBig = new Error('Value (' + num + ') is too big');
                tooBig.statusCode = httpStatus.BAD_REQUEST;
                throw tooBig;
            }
            trainingObj[field.name] = num;
        }
    });
    return trainingObj;
}
async function fetchTraining(project) {
    const count = await store.countTraining('numbers', project.id);
    const training = await store.getNumberTraining(project.id, {
        start: 0, limit: count,
    });
    const fieldsInfo = await store.getNumberProjectFields(project.userid, project.classid, project.id);
    return training.filter((item) => item.label && project.labels.includes(item.label))
        .map((item) => {
        return [
            prepareDataObject(fieldsInfo, item.numberdata),
            item.label,
        ];
    });
}
async function getVisualisationFromModelServer(project) {
    const req = {
        auth: {
            user: process.env[env.NUMBERS_SERVICE_USER],
            pass: process.env[env.NUMBERS_SERVICE_PASS],
        },
        qs: {
            tenantid: project.classid,
            studentid: project.userid,
            projectid: project.id,
            formats: 'dot,svg',
        },
        json: true,
    };
    const url = process.env[env.NUMBERS_SERVICE] + '/api/models';
    let response;
    try {
        response = await request.get(url, req);
    }
    catch (err) {
        if (err.statusCode === httpStatus.NOT_FOUND) {
            const classifier = await trainClassifier(project);
            if (classifier.status === 'Available') {
                response = await request.get(url, req);
            }
            else {
                log.error({ classifier, projectid: project.id }, 'Failed to create missing classifier for viz');
                throw new Error('Failed to create classifier');
            }
        }
        else {
            throw err;
        }
    }
    return response;
}
async function getVisualisationFromOpenWhisk(project) {
    const rawTraining = await fetchTraining(project);
    const examples = [];
    const labels = [];
    for (const trainingItem of rawTraining) {
        examples.push(trainingItem[0]);
        labels.push(trainingItem[1]);
    }
    const url = openwhisk.getUrl(openwhisk.FUNCTIONS.DESCRIBE_MODEL);
    const headers = openwhisk.getHeaders();
    const serverlessRequest = {
        url,
        method: 'POST',
        json: true,
        headers: Object.assign(Object.assign({}, headers), { 'User-Agent': 'machinelearningforkids.co.uk', 'Accept': 'application/json' }),
        body: compress({
            examples,
            labels,
            formats: ['dot', 'svg'],
        }),
    };
    try {
        const response = await request.post(serverlessRequest);
        return response;
    }
    catch (err) {
        log.error({ err, url }, 'Failed to submit OpenWhisk request');
        // could fall back to sending it to taxinomitis-numbers if
        //  there is an OpenWhisk-specific problem?
        // return getVisualisationFromModelServer(project);
        throw err;
    }
}
let execution = 'local';
function chooseExecutionEnvironment() {
    openwhisk.isOpenWhiskConfigured()
        .then((okayToUseOpenWhisk) => {
        if (okayToUseOpenWhisk) {
            execution = 'openwhisk';
        }
    });
}
chooseExecutionEnvironment();
function getModelVisualisation(project) {
    if (execution === 'openwhisk') {
        return getVisualisationFromOpenWhisk(project);
    }
    else {
        return getVisualisationFromModelServer(project);
    }
}
exports.getModelVisualisation = getModelVisualisation;
function compress(obj) {
    const compressed = {
        examplesKey: Object.keys(obj.examples[0]),
        examples: obj.examples.map((example) => {
            return Object.values(example);
        }),
        labelsKey: [],
        formats: obj.formats,
        labels: [],
    };
    compressed.labels = obj.labels.map((label) => {
        let idx = compressed.labelsKey.indexOf(label);
        if (idx === -1) {
            idx = (compressed.labelsKey.push(label)) - 1;
        }
        return idx;
    });
    return compressed;
}
exports.compress = compress;
// this function is only needed for testing, as it's the Python implementation of
//  the OpenWhisk action that actually needs to do the decompress
function decompress(obj) {
    return {
        examples: obj.examples.map((examplekey) => {
            const example = {};
            for (let idx = 0; idx < obj.examplesKey.length; idx++) {
                const key = obj.examplesKey[idx];
                example[key] = examplekey[idx];
            }
            return example;
        }),
        labels: obj.labels.map((labelkey) => {
            return obj.labelsKey[labelkey];
        }),
        formats: obj.formats,
    };
}
exports.decompress = decompress;
