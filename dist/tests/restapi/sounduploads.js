"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const uuid = require("uuid/v1");
const sinon = require("sinon");
const IBMCosSDK = require("ibm-cos-sdk");
const request = require("supertest");
const httpStatus = require("http-status");
const store = require("../../lib/db/store");
const auth = require("../../lib/restapi/auth");
const objectstore = require("../../lib/objectstore");
const uploads_1 = require("../../lib/restapi/sounds/uploads");
const mock = require("../imagestore/mockStore");
const testserver_1 = require("./testserver");
let testServer;
describe('REST API - sound uploads', () => {
    let authStub;
    let checkUserStub;
    let requireSupervisorStub;
    const TESTCLASS = 'TESTCLASS';
    let NEXT_USERID = 'studentid';
    function authNoOp(req, res, next) {
        const reqWithUser = req;
        reqWithUser.user = {
            sub: NEXT_USERID,
            app_metadata: {},
        };
        next();
    }
    let oldEnvCreds;
    let oldEnvBucket;
    before(async () => {
        authStub = sinon.stub(auth, 'authenticate').callsFake(authNoOp);
        checkUserStub = sinon.stub(auth, 'checkValidUser').callsFake(authNoOp);
        requireSupervisorStub = sinon.stub(auth, 'requireSupervisor').callsFake(authNoOp);
        oldEnvCreds = process.env.OBJECT_STORE_CREDS;
        oldEnvBucket = process.env.OBJECT_STORE_BUCKET;
        process.env.OBJECT_STORE_CREDS = JSON.stringify({
            endpoint: 'localhost:9999',
            apiKeyId: 'myApiKey',
            ibmAuthEndpoint: 'https://iam.ng.bluemix.net/oidc/token',
            serviceInstanceId: 'uniqServInstanceId',
        });
        process.env.OBJECT_STORE_BUCKET = 'TESTBUCKET';
        await store.init();
        testServer = testserver_1.default();
    });
    after(async () => {
        process.env.OBJECT_STORE_CREDS = oldEnvCreds;
        process.env.OBJECT_STORE_BUCKET = oldEnvBucket;
        authStub.restore();
        checkUserStub.restore();
        requireSupervisorStub.restore();
        await store.deleteProjectsByClassId(TESTCLASS);
        return store.disconnect();
    });
    let cosStub;
    beforeEach(() => {
        mock.reset();
        cosStub = sinon.stub(IBMCosSDK, 'S3');
        cosStub.returns(mock.mockS3);
        objectstore.init();
        NEXT_USERID = 'studentid';
    });
    afterEach(() => {
        cosStub.restore();
    });
    describe('invalid uploads', () => {
        let projectid = '';
        before(() => {
            return store.storeProject('studentid', TESTCLASS, 'sounds', 'invalids', 'en', [], false)
                .then((proj) => {
                projectid = proj.id;
                return store.addLabelToProject('studentid', TESTCLASS, projectid, 'KNOWN');
            });
        });
        it('should require a valid project', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/NOTAREALPROJECT/sounds')
                .expect(httpStatus.NOT_FOUND)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Not found' });
            });
        });
        it('should require data', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/sounds')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Audio label not provided' });
            });
        });
        it('should require audio data', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/sounds')
                .send({ label: 'KNOWN' })
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Missing data' });
            });
        });
        it('should require a label', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/sounds')
                .send({ data: [1, 2, 3, 4] })
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Audio label not provided' });
            });
        });
        it('should only support sound projects', async () => {
            const project = await store.storeProject('studentid', TESTCLASS, 'text', 'invalid', 'en', [], false);
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + project.id + '/sounds')
                .send({ label: 'label', data: [1, 2, 3] })
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Only sounds projects allow sound uploads' });
            });
        });
        it('should require a known label', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/sounds')
                .send({ label: 'MYSTERY', data: [1, 2, 3] })
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Unrecognised label' });
            });
        });
    });
    describe('valid uploads', () => {
        it('should upload test data', async () => {
            const USER = 'TESTSTUDENT';
            const LABEL = 'testlabel';
            const project = await store.storeProject(USER, TESTCLASS, 'sounds', 'test uploads', 'en', [], false);
            await store.addLabelToProject(USER, TESTCLASS, project.id, LABEL);
            const SOUNDSURL = '/api/classes/' + TESTCLASS +
                '/students/' + USER +
                '/projects/' + project.id +
                '/sounds';
            NEXT_USERID = USER;
            const numbers = [];
            for (let i = 0; i < 10000; i++) {
                numbers.push(Math.random());
            }
            return request(testServer)
                .post(SOUNDSURL)
                .send({ label: LABEL, data: numbers })
                .expect(httpStatus.CREATED)
                .then((res) => {
                assert(res.body.id);
                assert.strictEqual(res.body.label, LABEL);
                assert.strictEqual(res.body.projectid, project.id);
                assert.strictEqual(res.body.audiourl, SOUNDSURL + '/' + res.body.id);
                assert(res.header.etag);
                return store.deleteTraining('sounds', 'TESTPROJECT', res.body.id);
            });
        });
        it('should store very large audio training', async () => {
            const USER = 'TESTSTUDENT';
            const project = await store.storeProject(USER, TESTCLASS, 'sounds', 'demo', 'en', [], false);
            await store.addLabelToProject(USER, TESTCLASS, project.id, 'fruit');
            await store.addLabelToProject(USER, TESTCLASS, project.id, 'SECOND');
            const projectid = project.id;
            const trainingurl = '/api/classes/' + TESTCLASS +
                '/students/' + USER +
                '/projects/' + projectid +
                '/sounds';
            NEXT_USERID = USER;
            const numbers = [];
            for (let i = 0; i < uploads_1.MAX_AUDIO_POINTS; i++) {
                numbers.push(1234567890.01234567890123456789);
            }
            return request(testServer)
                .post(trainingurl)
                .send({
                data: numbers,
                label: 'fruit',
            })
                .expect(httpStatus.CREATED)
                .then(() => {
                return store.deleteEntireUser(USER, TESTCLASS);
            });
        });
    });
    describe('invalid downloads', () => {
        let projectid = '';
        before(() => {
            return store.storeProject('studentid', TESTCLASS, 'sounds', 'invalids', 'en', [], false)
                .then((proj) => {
                projectid = proj.id;
            });
        });
        it('should handle non-existent images', () => {
            return request(testServer)
                .get('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/sounds/anaudioid')
                .expect(httpStatus.NOT_FOUND)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'File not found' });
            });
        });
    });
    describe('valid downloads', () => {
        it('should download a file', async () => {
            let id;
            const userid = uuid();
            const testdata = [];
            for (let i = 0; i < 19000; i++) {
                testdata.push(Math.random());
            }
            const project = await store.storeProject(userid, TESTCLASS, 'sounds', 'valid', 'en', [], false);
            const projectid = project.id;
            const label = 'testlabel';
            await store.addLabelToProject(userid, TESTCLASS, projectid, label);
            NEXT_USERID = userid;
            const soundsurl = '/api/classes/' + TESTCLASS +
                '/students/' + userid +
                '/projects/' + projectid +
                '/sounds';
            await request(testServer)
                .post(soundsurl)
                .send({ label, data: testdata })
                .expect(httpStatus.CREATED)
                .then((res) => {
                assert(res.body.id);
                id = res.body.id;
                assert.strictEqual(res.body.projectid, projectid);
                assert.strictEqual(res.body.audiourl, soundsurl + '/' + id);
            });
            await request(testServer)
                .get(soundsurl + '/' + id)
                .expect(httpStatus.OK)
                .expect('Content-Type', /json/)
                .then((res) => {
                assert.deepStrictEqual(res.body, testdata);
                assert.strictEqual(res.header['cache-control'], 'max-age=31536000');
            });
            if (id) {
                return store.deleteTraining('sounds', projectid, id);
            }
        });
    });
});
