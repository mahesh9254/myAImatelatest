"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const request = require("supertest");
const httpstatus = require("http-status");
const auth = require("../../lib/restapi/auth");
const testserver_1 = require("./testserver");
const testServer = testserver_1.default();
describe('REST API - Auth', () => {
    describe('auth middleware', () => {
        it('checkValidUser - need a user', (done) => {
            const req = {};
            const res = {
                status: (code) => {
                    assert.strictEqual(code, 401);
                    return {
                        json: (obj) => {
                            assert.deepStrictEqual(obj, { error: 'Not authorised' });
                            done();
                        },
                    };
                },
            };
            auth.checkValidUser(req, res, () => {
                // not used
            });
        });
        // it('checkValidUser - need user metadata', (done) => {
        //     const req = {
        //         user : {
        //             name : 'unauthorized bob',
        //         },
        //     } as Express.Request;
        //     const res = {
        //         status : (code) => {
        //             assert.strictEqual(code, 401);
        //             return {
        //                 json : (obj) => {
        //                     assert.deepStrictEqual(obj, { error : 'Not authorised' });
        //                     done();
        //                 },
        //             };
        //         },
        //     } as Express.Response;
        //     auth.checkValidUser(req, res, () => {
        //         // not used
        //     });
        // });
        it('checkValidUser - need the right tenant', (done) => {
            const reqValues = {
                params: {
                    classid: 'REQUESTEDTENANT',
                },
                user: {
                    app_metadata: {
                        tenant: 'USERSTENANT',
                    },
                },
            };
            const req = reqValues;
            const res = {
                status: (code) => {
                    assert.strictEqual(code, 403);
                    return {
                        json: (obj) => {
                            assert.deepStrictEqual(obj, { error: 'Invalid access' });
                            done();
                        },
                    };
                },
            };
            auth.checkValidUser(req, res, () => {
                // not used
            });
        });
        it('checkValidUser - valid user', (done) => {
            const reqValues = {
                params: {
                    classid: 'USERSTENANT',
                },
                user: {
                    app_metadata: {
                        tenant: 'USERSTENANT',
                    },
                },
            };
            const req = reqValues;
            const resp = {};
            auth.checkValidUser(req, resp, () => {
                done();
            });
        });
        it('requireSupervisor - need the right role', (done) => {
            const reqValues = {
                params: {
                    classid: 'USERSTENANT',
                },
                user: {
                    app_metadata: {
                        tenant: 'USERSTENANT',
                        role: 'student',
                    },
                },
            };
            const req = reqValues;
            const res = {
                status: (code) => {
                    assert.strictEqual(code, 403);
                    return {
                        json: (obj) => {
                            assert.deepStrictEqual(obj, { error: 'Only supervisors are allowed to invoke this' });
                            done();
                        },
                    };
                },
            };
            auth.requireSupervisor(req, res, () => {
                // not used
            });
        });
        it('requireSupervisor - valid supervisor', (done) => {
            const reqValues = {
                params: {
                    classid: 'USERSTENANT',
                },
                user: {
                    app_metadata: {
                        tenant: 'USERSTENANT',
                        role: 'supervisor',
                    },
                },
            };
            const req = reqValues;
            const res = {};
            auth.requireSupervisor(req, res, () => {
                done();
            });
        });
        it('verifyProjectAccess - default to reject if no DB', (done) => {
            const req = {
                params: {
                    studentid: 'bob',
                    classid: 'test',
                    projectid: 'tutorial',
                },
            };
            const res = {};
            auth.verifyProjectAccess(req, res, (err) => {
                assert(err);
                done();
            });
        });
    });
    describe('getStudents()', () => {
        it('should require auth', () => {
            return request(testServer)
                .get('/api/classes/testclassid/students')
                .expect('Content-Type', /json/)
                .expect(httpstatus.UNAUTHORIZED)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Not authorised' });
            });
        });
    });
    describe('createStudent()', () => {
        it('should require auth', () => {
            return request(testServer)
                .post('/api/classes/testclassid/students')
                .send({})
                .expect('Content-Type', /json/)
                .expect(httpstatus.UNAUTHORIZED)
                .then((res) => {
                assert.deepStrictEqual(res.body, { error: 'Not authorised' });
            });
        });
    });
});
