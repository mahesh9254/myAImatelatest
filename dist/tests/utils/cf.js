"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const cf = require("../../lib/utils/cf");
describe('Utils - cf', () => {
    let oldEnvCf;
    let oldEnvIn;
    before(() => {
        oldEnvCf = process.env.CF_INSTANCE_INDEX;
        oldEnvIn = process.env.PRIMARY_INSTANCE;
    });
    after(() => {
        process.env.CF_INSTANCE_INDEX = oldEnvCf;
        process.env.PRIMARY_INSTANCE = oldEnvIn;
    });
    it('should work outside Bluemix', () => {
        delete process.env.CF_INSTANCE_INDEX;
        assert.strictEqual(cf.isPrimaryInstance(), true);
    });
    it('should recognise when primary instance in US-South', () => {
        process.env.CF_INSTANCE_INDEX = '0';
        process.env.PRIMARY_INSTANCE = 'true';
        assert.strictEqual(cf.isPrimaryInstance(), true);
    });
    it('should recognise when secondary instance in US-South', () => {
        process.env.CF_INSTANCE_INDEX = '1';
        process.env.PRIMARY_INSTANCE = 'true';
        assert.strictEqual(cf.isPrimaryInstance(), false);
    });
    it('should recognise when primary instance in EU-GB', () => {
        process.env.CF_INSTANCE_INDEX = '0';
        process.env.PRIMARY_INSTANCE = 'false';
        assert.strictEqual(cf.isPrimaryInstance(), false);
    });
    it('should recognise when secondary instance in EU-GB', () => {
        process.env.CF_INSTANCE_INDEX = '1';
        process.env.PRIMARY_INSTANCE = 'false';
        assert.strictEqual(cf.isPrimaryInstance(), false);
    });
});
