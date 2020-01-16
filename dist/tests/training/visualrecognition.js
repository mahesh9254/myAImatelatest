"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint no-unused-vars: 0 */
// tslint:disable:max-line-length
const uuid = require("uuid/v1");
const fs = require("fs");
const assert = require("assert");
const sinon = require("sinon");
const request = require("request-promise");
const clone = require("clone");
const tmp = require("tmp");
const store = require("../../lib/db/store");
const visrec = require("../../lib/training/visualrecognition");
const iam = require("../../lib/iam");
const downloadAndZip = require("../../lib/utils/downloadAndZip");
const mockstore = require("./mockstore");
describe('Training - Visual Recognition', () => {
    let getStub;
    let createStub;
    let deleteStub;
    let getProjectStub;
    let authStoreStub;
    let authByIdStoreStub;
    let countStoreStub;
    let getImageClassifiers;
    let getStoreStub;
    let storeStoreStub;
    let deleteStoreStub;
    let storeScratchKeyStub;
    let resetExpiredScratchKeyStub;
    let getClassStub;
    let setTimeoutStub;
    let downloadStub;
    before(() => {
        iam.init();
        // @ts-ignore
        getStub = sinon.stub(request, 'get');
        // @ts-ignore
        getStub.withArgs(sinon.match(/.*classifiers.*/), sinon.match.any).callsFake(mockVisRec.getClassifier);
        // @ts-ignore
        getStub.withArgs(sinon.match(/.*classify/), sinon.match.any).callsFake(mockVisRec.testClassify);
        // @ts-ignore
        createStub = sinon.stub(request, 'post');
        // @ts-ignore
        createStub.withArgs(sinon.match(/.*classifiers/), sinon.match.any).callsFake(mockVisRec.createClassifier);
        // @ts-ignore
        createStub.withArgs(sinon.match(/.*classify/), sinon.match.any).callsFake(mockVisRec.testClassify);
        // @ts-ignore
        deleteStub = sinon.stub(request, 'delete').callsFake(mockVisRec.deleteClassifier);
        getProjectStub = sinon.stub(store, 'getProject').callsFake(mockstore.getProject);
        authStoreStub = sinon.stub(store, 'getBluemixCredentials').callsFake(mockstore.getBluemixCredentials);
        authByIdStoreStub = sinon.stub(store, 'getBluemixCredentialsById').callsFake(mockstore.getBluemixCredentialsById);
        getImageClassifiers = sinon.stub(store, 'getImageClassifiers').callsFake(mockstore.getImageClassifiers);
        countStoreStub = sinon.stub(store, 'countTrainingByLabel').callsFake(mockstore.countTrainingByLabel);
        getStoreStub = sinon.stub(store, 'getImageTrainingByLabel').callsFake(mockstore.getImageTrainingByLabel);
        storeStoreStub = sinon.stub(store, 'storeImageClassifier').callsFake(mockstore.storeImageClassifier);
        deleteStoreStub = sinon.stub(store, 'deleteImageClassifier').callsFake(mockstore.deleteImageClassifier);
        storeScratchKeyStub = sinon.stub(store, 'storeOrUpdateScratchKey').callsFake(mockstore.storeOrUpdateScratchKey);
        resetExpiredScratchKeyStub = sinon.stub(store, 'resetExpiredScratchKey').callsFake(mockstore.resetExpiredScratchKey);
        getClassStub = sinon.stub(store, 'getClassTenant').callsFake(mockstore.getClassTenant);
        const fakeTimer = {};
        // @ts-ignore
        setTimeoutStub = sinon.stub(global, 'setTimeout').returns(fakeTimer);
        downloadStub = sinon.stub(downloadAndZip, 'run').callsFake(mockDownloadAndZip.run);
    });
    after(() => {
        getStub.restore();
        createStub.restore();
        deleteStub.restore();
        getProjectStub.restore();
        authStoreStub.restore();
        authByIdStoreStub.restore();
        getImageClassifiers.restore();
        countStoreStub.restore();
        getStoreStub.restore();
        storeStoreStub.restore();
        deleteStoreStub.restore();
        storeScratchKeyStub.restore();
        resetExpiredScratchKeyStub.restore();
        getClassStub.restore();
        setTimeoutStub.restore();
        downloadStub.restore();
    });
    describe('create classifier', () => {
        it('should create a classifier', async () => {
            storeScratchKeyStub.reset();
            const classid = 'TESTTENANT';
            const userid = 'bob';
            const projectid = 'projectbobvis';
            const projectname = 'Bob\'s images proj';
            const project = {
                id: projectid,
                name: projectname,
                userid, classid,
                type: 'images',
                language: 'en',
                labels: ['rock', 'paper'],
                numfields: 0,
                isCrowdSourced: false,
            };
            const classifier = await visrec.trainClassifier(project);
            assert(classifier.id);
            assert.deepStrictEqual(classifier, {
                id: classifier.id,
                name: projectname,
                classifierid: 'good',
                status: 'training',
                url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/good',
                credentialsid: '456',
                created: newClassifierDate,
                expiry: newExpiryDate,
            });
            assert(storeScratchKeyStub.calledWith(project, mockstore.credsForVisRec, 'good', sinon.match.any));
        });
        it('should not try to create a classifier without enough training data', async () => {
            storeScratchKeyStub.reset();
            const classid = 'TESTTENANT';
            const userid = 'bob';
            const projectid = 'tinyvis';
            const projectname = 'Bob\'s small images proj';
            const project = {
                id: projectid,
                name: projectname,
                userid, classid,
                language: 'en',
                type: 'images',
                labels: ['rock', 'paper'],
                numfields: 0,
                isCrowdSourced: false,
            };
            try {
                await visrec.trainClassifier(project);
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Not enough images to train the classifier');
            }
            assert.strictEqual(storeScratchKeyStub.called, false);
        });
        it('should not try to create a classifier with too much training data', async () => {
            storeScratchKeyStub.reset();
            const classid = 'TESTTENANT';
            const userid = 'bob';
            const projectid = 'massivevis';
            const projectname = 'Bob\'s huge images proj';
            const project = {
                id: projectid,
                name: projectname,
                userid, classid,
                language: 'en',
                type: 'images',
                labels: ['rock', 'paper'],
                numfields: 0,
                isCrowdSourced: false,
            };
            try {
                await visrec.trainClassifier(project);
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Number of images exceeds maximum (10000)');
            }
            assert.strictEqual(storeScratchKeyStub.called, false);
        });
        it('should handle hitting limits on API keys', async () => {
            storeScratchKeyStub.reset();
            const classid = 'TESTTENANT';
            const userid = 'bob';
            const projectid = 'projectbobvislim';
            const projectname = 'Bob\'s other images proj';
            const project = {
                id: projectid,
                name: projectname,
                userid, classid,
                type: 'images',
                language: 'en',
                labels: ['rock', 'paper'],
                numfields: 0,
                isCrowdSourced: false,
            };
            try {
                await visrec.trainClassifier(project);
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, visrec.ERROR_MESSAGES.INSUFFICIENT_API_KEYS);
            }
            assert.strictEqual(storeScratchKeyStub.called, false);
        });
    });
    describe('test classifier', () => {
        const PLACEHOLDER_IMAGE_FILE = '/tmp/image.jpg';
        const classifierTimestamp = new Date();
        classifierTimestamp.setMilliseconds(0);
        before((done) => {
            fs.writeFile(PLACEHOLDER_IMAGE_FILE, 'placeholderdata', done);
        });
        after((done) => {
            fs.unlink(PLACEHOLDER_IMAGE_FILE, done);
        });
        it('should classify images by URL', async () => {
            const creds = mockstore.credsForVisRec;
            const classes = await visrec.testClassifierURL(creds, 'good', classifierTimestamp, 'projectbobvis', 'http://test.com/image.jpg');
            assert.deepStrictEqual(classes, [
                { class_name: 'rock', confidence: 65, classifierTimestamp },
                { class_name: 'paper', confidence: 13, classifierTimestamp },
            ]);
        });
        it('should classify images by file', async () => {
            const creds = mockstore.credsForVisRec;
            const classes = await visrec.testClassifierFile(creds, 'good', classifierTimestamp, 'projectbobvis', PLACEHOLDER_IMAGE_FILE);
            assert.deepStrictEqual(classes, [
                { class_name: 'rock', confidence: 75, classifierTimestamp },
                { class_name: 'paper', confidence: 3, classifierTimestamp },
            ]);
        });
    });
    describe('delete classifier', () => {
        it('should delete a classifier', async () => {
            deleteStub.reset();
            deleteStoreStub.reset();
            setTimeoutStub.reset();
            resetExpiredScratchKeyStub.reset();
            assert.strictEqual(deleteStub.called, false);
            assert.strictEqual(deleteStoreStub.called, false);
            assert.strictEqual(setTimeoutStub.called, false);
            await visrec.deleteClassifier(goodClassifier);
            assert(deleteStub.calledOnce);
            assert(deleteStoreStub.calledOnce);
            assert(deleteStub.calledWith('https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/good', {
                qs: { version: '2016-05-20', api_key: 'userpass' },
                headers: { 'user-agent': 'machinelearningforkids', 'X-Watson-Learning-Opt-Out': 'true' },
                timeout: 120000, gzip: true, json: true,
            }));
            assert(deleteStoreStub.calledWith(goodClassifier.id));
            assert(resetExpiredScratchKeyStub.called);
            assert(setTimeoutStub.called);
        });
        it('should handle deleting unknown classifiers', async () => {
            deleteStub.reset();
            deleteStoreStub.reset();
            setTimeoutStub.reset();
            resetExpiredScratchKeyStub.reset();
            assert.strictEqual(deleteStub.called, false);
            assert.strictEqual(deleteStoreStub.called, false);
            await visrec.deleteClassifier(unknownClassifier);
            assert(deleteStub.calledOnce);
            assert(deleteStoreStub.calledOnce);
            assert(setTimeoutStub.calledOnce);
            assert(deleteStub.calledWith('https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/unknown', {
                qs: { version: '2016-05-20', api_key: 'userpass' },
                headers: { 'user-agent': 'machinelearningforkids', 'X-Watson-Learning-Opt-Out': 'true' },
                timeout: 120000, gzip: true, json: true,
            }));
            assert(deleteStoreStub.calledWith(unknownClassifier.id));
            assert(resetExpiredScratchKeyStub.called);
        });
    });
    describe('get classifier info', () => {
        it('should get info for a ready classifier', async () => {
            const reqClone = clone([goodClassifier]);
            const one = await visrec.getClassifierStatuses('CLASSID', reqClone);
            assert.deepStrictEqual(one, [goodClassifierWithStatus]);
        });
        it('should get info for unknown classifiers', async () => {
            const reqClone = clone([
                unknownClassifier,
                goodClassifier,
            ]);
            const three = await visrec.getClassifierStatuses('CLASSID', reqClone);
            assert.deepStrictEqual(three, [
                unknownClassifierWithStatus,
                goodClassifierWithStatus,
            ]);
        });
    });
    const newClassifierDate = new Date();
    newClassifierDate.setMilliseconds(0);
    const newExpiryDate = new Date();
    newExpiryDate.setMilliseconds(0);
    newExpiryDate.setHours(newClassifierDate.getHours() + 3);
    const mockVisRec = {
        getClassifier: (url) => {
            return new Promise((resolve, reject) => {
                switch (url) {
                    case 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/good':
                        return resolve(goodClassifierStatus);
                    // case 'http://visual.recognition.service/v1/classifiers/bad':
                    //     return resolve(brokenClassifierStatus);
                    // case 'http://visual.recognition.service/v1/classifiers/stillgoing':
                    //     return resolve(trainingClassifierStatus);
                    default:
                        return reject({
                            error: 'Resource not found',
                        });
                }
            });
        },
        deleteClassifier: (url) => {
            const prom = new Promise((resolve, reject) => {
                switch (url) {
                    case 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/good':
                        return resolve();
                    case 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/bad':
                        return resolve();
                    case 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/stillgoing':
                        return resolve();
                    default:
                        return reject({ error: 'Resource not found' });
                }
            });
            return prom;
        },
        testClassify: (url, opts) => {
            assert.strictEqual(url, 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classify');
            assert.strictEqual(opts.qs.version, '2016-05-20');
            assert.strictEqual(opts.qs.api_key, 'userpass');
            assert.strictEqual(opts.headers['user-agent'], 'machinelearningforkids');
            assert.strictEqual(opts.headers['X-Watson-Learning-Opt-Out'], 'true');
            const fileOptions = opts;
            const urlOptions = opts;
            if (urlOptions.qs.classifier_ids === 'good' && urlOptions.qs.url) {
                assert.strictEqual(urlOptions.qs.threshold, 0.0);
                assert(urlOptions.qs.url.startsWith('http'));
                return new Promise((resolve) => {
                    return resolve({
                        images: [
                            {
                                classifiers: [
                                    {
                                        classes: [
                                            { class: 'rock', score: 0.645656 },
                                            { class: 'paper', score: 0.132234 },
                                        ],
                                        classifier_id: 'good',
                                        name: 'Bob\'s images proj',
                                    },
                                ],
                                resolved_url: 'https://some-server.com/your-image.jpg',
                                source_url: urlOptions.qs.url,
                            },
                        ],
                        images_processed: 1,
                    });
                });
            }
            else if (fileOptions.formData.parameters.value === JSON.stringify({
                owners: ['me'], classifier_ids: ['good'], threshold: 0.0,
            })) {
                assert(fileOptions.formData.images_file);
                return new Promise((resolve) => {
                    return resolve({
                        images: [
                            {
                                classifiers: [
                                    {
                                        classes: [
                                            { class: 'rock', score: 0.745656 },
                                            { class: 'paper', score: 0.032234 },
                                        ],
                                        classifier_id: 'good',
                                        name: 'Bob\'s images proj',
                                    },
                                ],
                                image: 'your-image.jpg',
                            },
                        ],
                        images_processed: 1,
                    });
                });
            }
        },
        createClassifier: (url, options) => {
            assert.strictEqual(options.headers['X-Watson-Learning-Opt-Out'], 'true');
            if (options.formData.name === 'Bob\'s images proj') {
                assert.strictEqual(options.qs.version, '2016-05-20');
                assert.strictEqual(options.qs.api_key, 'userpass');
                assert.strictEqual(options.json, true);
                assert.strictEqual(options.formData.name, 'Bob\'s images proj');
                const rockStream = options.formData.rock_positive_examples;
                assert.strictEqual(typeof rockStream.path, 'string');
                const paperStream = options.formData.paper_positive_examples;
                assert.strictEqual(typeof paperStream.path, 'string');
                return new Promise((resolve, reject) => {
                    resolve({
                        classifier_id: 'good',
                        name: 'Bob\'s images proj',
                        owner: 'bob',
                        status: 'training',
                        created: newClassifierDate.toISOString(),
                        classes: [
                            { class: 'rock' },
                            { class: 'paper' },
                        ],
                    });
                });
            }
            else {
                return new Promise((resolve, reject) => {
                    const err = {
                        error: {
                            error: {
                                description: 'Cannot execute learning task. : this plan instance can have only 1 custom classifier(s), and 1 already exist.',
                                code: 400,
                                error_id: 'input_error',
                            },
                        },
                        statusCode: 400,
                        status: 400,
                    };
                    reject(err);
                });
            }
        },
    };
    const goodClassifier = {
        id: uuid(),
        credentialsid: '456',
        name: 'good classifier',
        created: new Date(),
        expiry: new Date(),
        url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/good',
        classifierid: 'good',
    };
    const goodClassifierWithStatus = Object.assign({}, goodClassifier, {
        status: 'ready',
    });
    const goodClassifierStatus = {
        classifier_id: 'good',
        name: goodClassifier.name,
        owner: 'bob',
        status: 'ready',
        created: goodClassifier.created.toISOString(),
        classes: [
            { class: 'rock' },
            { class: 'paper' },
        ],
    };
    const unknownClassifier = {
        id: uuid(),
        credentialsid: '456',
        name: 'unknown classifier',
        created: new Date(),
        expiry: new Date(),
        url: 'https://gateway-a.watsonplatform.net/visual-recognition/api/v3/classifiers/unknown',
        classifierid: 'unknown',
    };
    const unknownClassifierWithStatus = Object.assign({}, unknownClassifier, {
        status: 'Non Existent',
    });
    const mockDownloadAndZip = {
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
});
