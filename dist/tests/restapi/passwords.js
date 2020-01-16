"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const sinon = require("sinon");
const request = require("supertest");
const httpstatus = require("http-status");
const auth = require("../../lib/restapi/auth");
const testserver_1 = require("./testserver");
let testServer;
describe('REST API - users', () => {
    let authStub;
    const AUTH_USERS = {
        STUDENT: {
            'https://machinelearningforkids.co.uk/api/role': 'student',
            'https://machinelearningforkids.co.uk/api/tenant': 'CLASSID',
        },
        TEACHER: {
            'https://machinelearningforkids.co.uk/api/role': 'supervisor',
            'https://machinelearningforkids.co.uk/api/tenant': 'CLASSID',
        },
        OTHERCLASS: {
            'https://machinelearningforkids.co.uk/api/role': 'supervisor',
            'https://machinelearningforkids.co.uk/api/tenant': 'DIFFERENT',
        },
    };
    let nextUser = AUTH_USERS.STUDENT;
    function authNoOp(req, res, next) {
        // @ts-ignore
        req.user = Object.assign({}, nextUser);
        next();
    }
    before(() => {
        authStub = sinon.stub(auth, 'authenticate').callsFake(authNoOp);
        testServer = testserver_1.default();
    });
    after(() => {
        authStub.restore();
    });
    describe('generatePassword()', () => {
        it('should check the class matches', () => {
            nextUser = AUTH_USERS.OTHERCLASS;
            return request(testServer)
                .get('/api/classes/CLASSID/passwords')
                .expect('Content-Type', /json/)
                .expect(httpstatus.FORBIDDEN)
                .then((res) => {
                assert.deepStrictEqual(res.body, {
                    error: 'Invalid access',
                });
            });
        });
        it('should reject requests from students', () => {
            nextUser = AUTH_USERS.STUDENT;
            return request(testServer)
                .get('/api/classes/CLASSID/passwords')
                .expect('Content-Type', /json/)
                .expect(httpstatus.FORBIDDEN)
                .then((res) => {
                assert.deepStrictEqual(res.body, {
                    error: 'Only supervisors are allowed to invoke this',
                });
            });
        });
        it('should return a password', () => {
            nextUser = AUTH_USERS.TEACHER;
            return request(testServer)
                .get('/api/classes/CLASSID/passwords')
                .expect('Content-Type', /json/)
                .expect(httpstatus.OK)
                .then((res) => {
                assert(res.body.password);
                assert.strictEqual(typeof res.body.password, 'string');
                assert(res.body.password.length > 8);
            });
        });
        it('should return unique passwords', async () => {
            nextUser = AUTH_USERS.TEACHER;
            const passwords = [];
            for (let i = 0; i < 100; i++) {
                const res = await request(testServer)
                    .get('/api/classes/CLASSID/passwords')
                    .expect('Content-Type', /json/)
                    .expect(httpstatus.OK);
                assert.strictEqual(passwords.includes(res.body.password), false);
                passwords.push(res.body.password);
            }
        });
    });
});
