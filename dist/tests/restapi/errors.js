"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const errors = require("../../lib/restapi/errors");
describe('REST API - Error Handling', () => {
    function validate(expectedStatusCode, expectedPayload, callback) {
        const res = {
            status: (code) => {
                assert.strictEqual(code, expectedStatusCode);
                return {
                    json: (obj) => {
                        assert.deepStrictEqual(obj, expectedPayload);
                        callback();
                    },
                };
            },
        };
        return res;
    }
    describe('Internal Server Errors', () => {
        it('DB errors', (done) => {
            const validator = validate(500, {
                error: 'Error accessing the database used to store data',
                detail: {
                    code: 1234,
                    errno: '9876',
                    sqlState: 'something',
                    message: 'DB go boom',
                },
            }, done);
            const testError = new Error('DB go boom');
            testError.code = 1234;
            testError.errno = '9876';
            testError.sqlState = 'something';
            errors.unknownError(validator, testError);
        });
        it('Bluemix errors', (done) => {
            const validator = validate(500, {
                error: 'Something about Watson',
            }, done);
            const testError = new Error('Something about Watson');
            errors.unknownError(validator, testError);
        });
        it('Empty errors', (done) => {
            const validator = validate(500, { error: 'Unknown error' }, done);
            errors.unknownError(validator, {});
        });
        it('Undefined errors', (done) => {
            const validator = validate(500, { error: 'Unknown error' }, done);
            errors.unknownError(validator, null);
        });
    });
});
