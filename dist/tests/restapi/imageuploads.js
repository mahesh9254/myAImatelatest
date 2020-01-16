"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const uuid = require("uuid/v1");
const sinon = require("sinon");
const IBMCosSDK = require("ibm-cos-sdk");
const request = require("supertest");
const httpStatus = require("http-status");
const store = require("../../lib/db/store");
const auth = require("../../lib/restapi/auth");
const imagestore = require("../../lib/objectstore");
const mock = require("../imagestore/mockStore");
const testserver_1 = require("./testserver");
let testServer;
describe('REST API - image uploads', () => {
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
        imagestore.init();
        NEXT_USERID = 'studentid';
    });
    afterEach(() => {
        cosStub.restore();
    });
    describe('invalid uploads', () => {
        let projectid = '';
        before(() => {
            return store.storeProject('studentid', TESTCLASS, 'images', 'invalids', 'en', [], false)
                .then((proj) => {
                projectid = proj.id;
                return store.addLabelToProject('studentid', TESTCLASS, projectid, 'KNOWN');
            });
        });
        it('should require a valid project', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/NOTAREALPROJECT/images')
                .expect(httpStatus.NOT_FOUND)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Not found' });
            });
        });
        it('should require a file', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/images')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'File not provided' });
            });
        });
        it('should require an image file', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/images')
                .attach('image', './package.json')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Unsupported file type application/json' });
            });
        });
        it('should require a label', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/images')
                .attach('image', './src/tests/utils/resources/test-02.jpg')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Image label not provided' });
            });
        });
        it('should only support image projects', async () => {
            const project = await store.storeProject('studentid', TESTCLASS, 'text', 'invalid', 'en', [], false);
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + project.id + '/images')
                .attach('image', './src/tests/utils/resources/test-04.jpg')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Only images projects allow image uploads' });
            });
        });
        it('should require a known label', () => {
            return request(testServer)
                .post('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/images')
                .attach('image', './src/tests/utils/resources/test-02.jpg')
                .field('label', 'MYSTERY')
                .expect(httpStatus.BAD_REQUEST)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Unrecognised label' });
            });
        });
    });
    describe('valid uploads', () => {
        it('should upload a file', async () => {
            const USER = 'TESTSTUDENT';
            const LABEL = 'testlabel';
            const project = await store.storeProject(USER, TESTCLASS, 'images', 'test uploads', 'en', [], false);
            await store.addLabelToProject(USER, TESTCLASS, project.id, LABEL);
            const IMAGESURL = '/api/classes/' + TESTCLASS +
                '/students/' + USER +
                '/projects/' + project.id +
                '/images';
            NEXT_USERID = USER;
            return request(testServer)
                .post(IMAGESURL)
                .attach('image', './src/tests/utils/resources/test-01.jpg')
                .field('label', LABEL)
                .expect(httpStatus.CREATED)
                .then((res) => {
                assert(res.body.id);
                assert.strictEqual(res.body.isstored, true);
                assert.strictEqual(res.body.label, LABEL);
                assert.strictEqual(res.body.projectid, project.id);
                assert(res.body.imageurl.startsWith(IMAGESURL));
                assert.strictEqual(res.body.imageurl, IMAGESURL + '/' + res.body.id);
                assert(res.header.etag);
                return store.deleteTraining('images', 'TESTPROJECT', res.body.id);
            });
        });
    });
    describe('invalid downloads', () => {
        let projectid = '';
        before(() => {
            return store.storeProject('studentid', TESTCLASS, 'images', 'invalids', 'en', [], false)
                .then((proj) => {
                projectid = proj.id;
            });
        });
        it('should handle non-existent images', () => {
            return request(testServer)
                .get('/api/classes/' + TESTCLASS + '/students/studentid/projects/' + projectid + '/images/someimageid')
                .expect(httpStatus.NOT_FOUND)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'File not found' });
            });
        });
    });
    describe('valid downloads', () => {
        function readFileToBuffer(path) {
            return new Promise((resolve, reject) => {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(data);
                });
            });
        }
        it('should download a file', async () => {
            let id;
            const filepath = './src/tests/utils/resources/test-01.jpg';
            const contents = await readFileToBuffer(filepath);
            const userid = uuid();
            const project = await store.storeProject(userid, TESTCLASS, 'images', 'valid', 'en', [], false);
            const projectid = project.id;
            const label = 'testlabel';
            await store.addLabelToProject(userid, TESTCLASS, projectid, label);
            NEXT_USERID = userid;
            const imagesurl = '/api/classes/' + TESTCLASS +
                '/students/' + userid +
                '/projects/' + projectid +
                '/images';
            await request(testServer)
                .post(imagesurl)
                .attach('image', filepath)
                .field('label', label)
                .expect(httpStatus.CREATED)
                .then((res) => {
                assert(res.body.id);
                id = res.body.id;
                assert.strictEqual(res.body.projectid, projectid);
            });
            await request(testServer)
                .get(imagesurl + '/' + id)
                .expect(httpStatus.OK)
                .then((res) => {
                assert.deepStrictEqual(res.body, contents);
                assert.strictEqual(res.header['content-type'], 'image/jpeg');
                assert.strictEqual(res.header['cache-control'], 'max-age=31536000');
            });
            if (id) {
                return store.deleteTraining('images', projectid, id);
            }
        });
    });
});
