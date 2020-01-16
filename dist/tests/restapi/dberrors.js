"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const sinon = require("sinon");
const request = require("supertest");
const httpstatus = require("http-status");
const store = require("../../lib/db/store");
const auth = require("../../lib/restapi/auth");
const testserver_1 = require("./testserver");
const mockMysqldb = require("../db/mockmysqldb");
let testServer;
describe('REST API - DB error handling', () => {
    let authStub;
    let checkUserStub;
    let requireSupervisorStub;
    function authNoOp(req, res, next) {
        const reqWithUser = req;
        reqWithUser.user = {
            sub: 'EXCEPTION',
            app_metadata: {},
        };
        next();
    }
    before(() => {
        authStub = sinon.stub(auth, 'authenticate').callsFake(authNoOp);
        checkUserStub = sinon.stub(auth, 'checkValidUser').callsFake(authNoOp);
        requireSupervisorStub = sinon.stub(auth, 'requireSupervisor').callsFake(authNoOp);
        store.replaceDbConnPoolForTest(mockMysqldb.MOCK_POOL);
        testServer = testserver_1.default();
    });
    after(() => {
        authStub.restore();
        checkUserStub.restore();
        requireSupervisorStub.restore();
        return store.disconnect();
    });
    describe('projects', () => {
        it('GET /api/classes/CLASSID/students/STUDENTID/projects', () => {
            return request(testServer)
                .get('/api/classes/CLASSID/students/STUDENTID/projects')
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Error accessing the database used to store data',
                    detail: {
                        code: 'ER_NO_SUCH_SELECT_ERROR',
                        errno: 6677,
                        sqlState: '#12S34',
                        message: 'Some technical sounding SQL error from selecting projects',
                    },
                });
            });
        });
        it('POST /api/classes/CLASSID/students/EXCEPTION/projects', () => {
            const projectDetails = { name: 'PROJECT NAME', type: 'text', language: 'es' };
            const url = '/api/classes/CLASSID/students/EXCEPTION/projects';
            return request(testServer)
                .post(url)
                .send(projectDetails)
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Error accessing the database used to store data',
                    detail: {
                        code: 'ER_SOME_INSERT_ERROR',
                        errno: 2929,
                        sqlState: '#12345',
                        message: 'We could not write the project to the DB',
                    },
                });
            });
        });
        it('POST /api/classes/CLASSID/students/STUDENTID/projects', () => {
            const projectDetails = { name: 'PROJECT NAME', type: 'text', language: 'nl' };
            const url = '/api/classes/CLASSID/students/STUDENTID/projects';
            return request(testServer)
                .post(url)
                .send(projectDetails)
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Failed to store project',
                });
            });
        });
        it('DELETE /api/classes/CLASSID/students/EXCEPTION/projects/PROJECTID', () => {
            const url = '/api/classes/CLASSID/students/EXCEPTION/projects/PROJECTID';
            return request(testServer)
                .delete(url)
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Error accessing the database used to store data',
                    detail: {
                        code: 'ER_SOME_DELETE_ERROR',
                        errno: 2129,
                        sqlState: '#98765',
                        message: 'We could not delete the project from the DB',
                    },
                });
            });
        });
    });
    describe('training data', () => {
        it('POST /api/classes/CLASSID/students/STUDENTID/projects/PROJECTID/training', () => {
            const url = '/api/classes/CLASSID/students/EXCEPTION/projects/PROJECTID/training';
            return request(testServer)
                .post(url)
                .send({
                data: 'throw an exception',
                label: 'fruit',
            })
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Error accessing the database used to store data',
                    detail: {
                        code: 'ER_SOME_INSERT_ERROR',
                        errno: 1919,
                        sqlState: '#12345',
                        message: 'We could not write the training data to the DB',
                    },
                });
            });
        });
        it('POST /api/classes/CLASSID/students/STUDENTID/projects/PROJECTID/training 2', () => {
            const url = '/api/classes/CLASSID/students/EXCEPTION/projects/PROJECTID/training';
            return request(testServer)
                .post(url)
                .send({
                data: 'dont throw an exception just fail',
                label: 'fruit',
            })
                .expect('Content-Type', /json/)
                .expect(httpstatus.INTERNAL_SERVER_ERROR)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, {
                    error: 'Failed to store training data',
                });
            });
        });
    });
});
