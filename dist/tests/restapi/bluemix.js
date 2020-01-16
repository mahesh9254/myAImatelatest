"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const request = require("supertest");
const httpStatus = require("http-status");
const testserver_1 = require("./testserver");
describe('REST API - Bluemix', () => {
    describe('security', () => {
        it('should require https on Bluemix', () => {
            process.env.BLUEMIX_REGION = 'something';
            const testServer = testserver_1.default();
            return request(testServer)
                .get('/')
                .expect(httpStatus.MOVED_PERMANENTLY)
                .then((res) => {
                assert(res.header.location.startsWith('https'));
                delete process.env.BLUEMIX_REGION;
            });
        });
    });
    describe('ping()', () => {
        it('should return a healthcheck ping', () => {
            const testServer = testserver_1.default();
            return request(testServer)
                .get('/api')
                .expect('Content-Type', /json/)
                .expect(httpStatus.OK)
                .then((res) => {
                const body = res.body;
                assert.strictEqual(typeof body, 'object');
                assert.strictEqual(Object.keys(body).length, 0);
            });
        });
    });
});
