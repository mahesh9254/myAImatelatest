"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const port_1 = require("../../lib/utils/port");
describe('Utils - port number', () => {
    it('should handle missing port numbers', () => {
        assert.strictEqual(port_1.default(undefined, 1234), 1234);
    });
    it('should handle invalid port numbers', () => {
        assert.strictEqual(port_1.default('hello', 1234), 1234);
    });
    it('should handle valid port numbers', () => {
        assert.strictEqual(port_1.default('5678', 1234), 5678);
    });
});
