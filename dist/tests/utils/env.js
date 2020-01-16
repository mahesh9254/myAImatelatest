"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const env = require("../../lib/utils/env");
describe('Utils - env', () => {
    let oldMysqlHost;
    let oldMysqlUser;
    before(() => {
        oldMysqlHost = process.env.MYSQLHOST;
        oldMysqlUser = process.env.MYSQLUSER;
    });
    after(() => {
        process.env.MYSQLHOST = oldMysqlHost;
        process.env.MYSQLUSER = oldMysqlUser;
    });
    it('should pass if variables are present', () => {
        process.env.MYSQLHOST = 'creds';
        process.env.MYSQLUSER = 'bucket';
        env.confirmRequiredEnvironment();
    });
    it('should fail if variables are missing', (done) => {
        delete process.env.MYSQLUSER;
        try {
            env.confirmRequiredEnvironment();
        }
        catch (err) {
            assert.strictEqual(err.message, 'Missing required environment variable MYSQLUSER');
            done();
        }
    });
});
