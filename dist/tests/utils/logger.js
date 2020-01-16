"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const logger_1 = require("../../lib/utils/logger");
describe('Utils - logger', () => {
    it('should create a logger', () => {
        const logger = logger_1.default();
        assert(logger.info);
        assert(logger.debug);
        assert(logger.error);
    });
});
