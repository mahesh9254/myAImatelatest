"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const request = require("supertest");
const httpStatus = require("http-status");
const testserver_1 = require("./testserver");
describe('REST API - UI', () => {
    let testServer;
    before(() => {
        testServer = testserver_1.default();
    });
    describe('ui redirects', () => {
        function verifyRedirect(name) {
            return request(testServer)
                .get('/' + name)
                .expect(httpStatus.FOUND)
                .then((res) => {
                assert.strictEqual(res.header.location, '/#!/' + name);
            });
        }
        it('should redirect main site sections', () => {
            const names = ['about', 'projects', 'news', 'teacher', 'worksheets', 'help', 'signup', 'login'];
            return Promise.all(names.map((name) => verifyRedirect(name)));
        });
    });
    describe('caching headers', () => {
        it.skip('should set required headers on responses', () => {
            return request(testServer)
                .get('/index.html')
                .expect('Content-Type', /html/)
                .expect(httpStatus.OK)
                .then((res) => {
                assert.strictEqual(res.header['cache-control'], 'public, max-age=0');
            });
        });
    });
});
