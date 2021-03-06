"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const request = require("supertest");
const httpstatus = require("http-status");
const jsonwebtoken = require("jsonwebtoken");
const store = require("../../lib/db/store");
const sessionusers = require("../../lib/sessionusers");
const testserver_1 = require("./testserver");
let testServer;
describe('REST API - session users auth', () => {
    before(() => {
        testServer = testserver_1.default();
        return store.init();
    });
    after(() => {
        return store.disconnect();
    });
    describe('auth session users', () => {
        let user;
        before(async () => {
            user = await store.storeTemporaryUser(3 * 60 * 1000);
        });
        after(() => {
            return store.deleteTemporaryUser(user);
        });
        it('authenticate API calls from session users - empty projects list', () => {
            const jwt = jsonwebtoken.sign(user, 'placeholdersecret');
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + user.id + '/projects')
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.OK)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, []);
            });
        });
        it('authenticate API calls from session users - fetch non-existent project', () => {
            const jwt = jsonwebtoken.sign(user, 'placeholdersecret');
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + user.id + '/projects/DOES-NOT-EXIST')
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.NOT_FOUND)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, { error: 'Not found' });
            });
        });
        it('authenticate API calls from session users - fetch project', async () => {
            const jwt = jsonwebtoken.sign(user, 'placeholdersecret');
            const project = await store.storeProject(user.id, sessionusers.CLASS_NAME, 'text', 'my test', 'en', [], false);
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + user.id + '/projects/' + project.id)
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.OK)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, project);
                return store.deleteEntireProject(user.id, sessionusers.CLASS_NAME, project);
            });
        });
        it('authenticate API calls from session users - invalid access', async () => {
            const project = await store.storeProject(user.id, sessionusers.CLASS_NAME, 'text', 'my 2nd test', 'fr', [], false);
            const diffUser = await store.storeTemporaryUser(100000);
            const jwt = jsonwebtoken.sign(diffUser, 'placeholdersecret');
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + user.id + '/projects/' + project.id)
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.UNAUTHORIZED)
                .then(async (res) => {
                const body = res.body;
                assert.deepStrictEqual(body, { error: 'Not authorised' });
                await store.deleteTemporaryUser(diffUser);
                await store.deleteEntireProject(user.id, sessionusers.CLASS_NAME, project);
            });
        });
        it('authenticate API calls from session users - handle invalid JWT tokens', async () => {
            const jwt = 'This is not a valid token, but it is lovely';
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + user.id + '/projects')
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.UNAUTHORIZED)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, { error: 'Not authorised' });
            });
        });
        it('authenticate API calls from session users - refuse access from expired users', async () => {
            const expiredUser = await store.storeTemporaryUser(-1000);
            const jwt = jsonwebtoken.sign(expiredUser, 'placeholdersecret');
            return request(testServer)
                .get('/api/classes/' + sessionusers.CLASS_NAME + '/students/' + expiredUser.id + '/projects')
                .set('Authorization', 'Bearer ' + jwt)
                .expect('Content-Type', /json/)
                .expect(httpstatus.UNAUTHORIZED)
                .then((res) => {
                const body = res.body;
                assert.deepStrictEqual(body, { error: 'Not authorised' });
                return store.deleteTemporaryUser(expiredUser);
            });
        });
    });
});
