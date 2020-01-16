"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const request = require("supertest");
const httpStatus = require("http-status");
const testserver_1 = require("./testserver");
describe('REST API - Security', () => {
    let testServer;
    before(() => {
        testServer = testserver_1.default();
    });
    describe('headers', () => {
        it('should set required headers on responses', () => {
            return request(testServer)
                .get('/api')
                .expect('Content-Type', /json/)
                .expect(httpStatus.OK)
                .then((res) => {
                assert.strictEqual(res.header['x-dns-prefetch-control'], 'off');
                assert.strictEqual(res.header['x-frame-options'], 'SAMEORIGIN');
                assert.strictEqual(res.header['x-content-type-options'], 'nosniff');
                assert.strictEqual(res.header['x-download-options'], 'noopen');
                assert.strictEqual(res.header['x-xss-protection'], '1; mode=block');
            });
        });
    });
});
