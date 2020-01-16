"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const randomstring = require("randomstring");
const uuid = require("uuid/v1");
const tmp = require("tmp");
const dbObjects = require("../../lib/db/objects");
const mockIam = require("../iam/mock-iam");
const USERID = uuid();
const CLASSIDS = {
    LEGACY: uuid(),
    NEW: uuid(),
};
exports.CREDENTIALS_LEGACY = {
    id: uuid(),
    username: randomstring.generate(20),
    password: randomstring.generate(20),
    servicetype: 'visrec',
    url: 'https://gateway-a.watsonplatform.net/visual-recognition/api',
    classid: CLASSIDS.LEGACY,
    credstype: 'visrec_standard',
};
exports.CREDENTIALS_NEW = {
    id: uuid(),
    username: mockIam.KEYS.VALID.substr(0, 22),
    password: mockIam.KEYS.VALID.substr(22),
    servicetype: 'visrec',
    url: 'https://gateway.watsonplatform.net/visual-recognition/api',
    classid: CLASSIDS.NEW,
    credstype: 'visrec_lite',
};
const STATES = {
    NEW: 'NEW',
    GOOD: 'GOOD',
    FULL: 'FULL',
    BAD: 'BAD',
    FAIL: 'FAIL',
};
exports.PROJECTS = {
    'my simple project name': {
        project: {
            id: uuid(),
            name: 'my simple project name',
            classid: CLASSIDS.LEGACY,
            userid: USERID,
            labels: ['first', 'second', 'third'],
            type: 'images',
            language: 'en',
            numfields: 0,
            isCrowdSourced: false,
        },
        training: {
            first: 12, second: 11, third: 17,
        },
    },
    'my shiny new and huge project': {
        project: {
            id: uuid(),
            name: 'my shiny new and huge project',
            classid: CLASSIDS.NEW,
            userid: USERID,
            labels: ['left', 'right'],
            type: 'images',
            language: 'en',
            numfields: 0,
            isCrowdSourced: false,
        },
        training: {
            left: 121, right: 117,
        },
    },
    'my failing project': {
        project: {
            id: uuid(),
            name: 'my failing project',
            classid: CLASSIDS.LEGACY,
            userid: USERID,
            labels: ['does', 'not', 'matter'],
            type: 'images',
            language: 'en',
            numfields: 0,
            isCrowdSourced: false,
        },
        training: {
            does: 0, not: 1, matter: 2,
        },
    },
};
const CLASSIFIERS = [
    {
        id: 'my_simple_project_name_201482304320',
        name: 'my simple project name',
        state: STATES.NEW,
    },
    {
        id: 'my_shiny_new_and_huge project_201488194732',
        name: 'my shiny new and huge project',
        state: STATES.NEW,
    },
    {
        id: 'my_failing_project_23480237524',
        name: 'my failing project',
        state: STATES.BAD,
    },
];
const CLASSIFIERS_BY_CLASSIFIER_ID = {};
exports.CLASSIFIERS_BY_PROJECT_NAME = {};
CLASSIFIERS.forEach((classifier) => {
    CLASSIFIERS_BY_CLASSIFIER_ID[classifier.id] = classifier;
    exports.CLASSIFIERS_BY_PROJECT_NAME[classifier.name] = classifier;
});
const PROJECTS_BY_ID = {};
Object.keys(exports.PROJECTS).forEach((projname) => {
    const project = exports.PROJECTS[projname].project;
    PROJECTS_BY_ID[project.id] = project;
});
exports.request = {
    create: (url, options) => {
        assert.strictEqual(typeof url, 'string');
        assert(options.qs.version);
        assert(options.headers);
        const classifier = exports.CLASSIFIERS_BY_PROJECT_NAME[options.formData.name];
        if (classifier.state === STATES.NEW) {
            return Promise.resolve({
                classifier_id: classifier.id,
                name: classifier.name,
                owner: 'bob',
                status: 'training',
                created: new Date().toISOString(),
            });
        }
        else if (classifier.state === STATES.FULL) {
            return Promise.reject({
                error: {
                    error: {
                        description: 'Cannot execute learning task. : ' +
                            'this plan instance can have only 1 custom classifier(s), ' +
                            'and 1 already exist.',
                        code: 400,
                        error_id: 'input_error',
                    },
                },
                statusCode: 400,
                status: 400,
            });
        }
    },
    delete: (url, opts) => {
        // TODO this is ridiculous... do I really have to fight with TypeScript like this?
        const unk = opts;
        const options = unk;
        assert(options && options.qs.version);
        assert(options && options.headers);
        const prom = Promise.resolve();
        return prom;
    },
};
exports.store = {
    getImageClassifiers: (projectid) => {
        assert(projectid);
        assert.strictEqual(typeof projectid, 'string');
        return Promise.resolve([]);
    },
    getImageTrainingByLabel: (projectid, label, options) => {
        const project = PROJECTS_BY_ID[projectid];
        const trainingCounts = exports.PROJECTS[project.name].training;
        const count = trainingCounts[label];
        const start = options.start;
        const limit = options.limit;
        const end = Math.min(start + limit, count);
        const training = [];
        for (let idx = start; idx < end; idx++) {
            const placeholder = {
                imageurl: 'http://' + randomstring.generate(10) + '.com/' + label + '-' + idx + '.jpg',
            };
            training.push(placeholder);
        }
        return Promise.resolve(training);
    },
    countTrainingByLabel: (project) => {
        return Promise.resolve(exports.PROJECTS[project.name].training);
    },
    getBluemixCredentials: (classid, service) => {
        assert.strictEqual(service, 'visrec');
        if (classid === CLASSIDS.LEGACY) {
            return Promise.resolve([exports.CREDENTIALS_LEGACY]);
        }
        else if (classid === CLASSIDS.NEW) {
            return Promise.resolve([exports.CREDENTIALS_NEW]);
        }
        else {
            return Promise.resolve([]);
        }
    },
    getBluemixCredentialsById: (credentialsid) => {
        switch (credentialsid) {
            case exports.CREDENTIALS_LEGACY.id:
                return Promise.resolve(exports.CREDENTIALS_LEGACY);
            case exports.CREDENTIALS_NEW.id:
                return Promise.resolve(exports.CREDENTIALS_NEW);
            default:
                throw new Error('Unexpected response when retrieving the service credentials');
        }
    },
    getClassTenant: (classid) => {
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
    },
    storeOrUpdateScratchKey: () => {
        return Promise.resolve('');
    },
    resetExpiredScratchKey: (id, projecttype) => {
        assert.strictEqual(typeof id, 'string');
        assert.strictEqual(projecttype, 'images');
        return Promise.resolve();
    },
    storeImageClassifier: (credentials, project, classifier) => {
        return Promise.resolve(dbObjects.createVisualClassifier(classifier, credentials, project));
    },
    deleteImageClassifier: (id) => {
        assert.strictEqual(typeof id, 'string');
        return Promise.resolve();
    },
};
exports.download = {
    run: (locations) => {
        return new Promise((resolve) => {
            for (const location of locations) {
                if (location.type === 'download') {
                    assert.strictEqual(typeof location.url, 'string');
                    assert(location.url.startsWith('http'));
                }
            }
            tmp.file((err, path) => {
                resolve(path);
            });
        });
    },
};
