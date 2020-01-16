"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const request = require("request-promise");
// local dependencies
const env = require("./env");
const logger_1 = require("./logger");
const log = logger_1.default();
let executionType = 'unknown';
exports.FUNCTIONS = {
    TEST: '/api/auth-check',
    RESIZE_IMAGE: '/api/resize-image',
    CREATE_ZIP: '/api/create-zip',
    DESCRIBE_MODEL: '/api/describe-model',
};
function getUrl(func) {
    return process.env[env.SERVERLESS_OPENWHISK_URL] + func;
}
exports.getUrl = getUrl;
function getHeaders() {
    return {
        'X-MachineLearningForKids-Function-Client-Id': process.env[env.SERVERLESS_OPENWHISK_KEY],
    };
}
exports.getHeaders = getHeaders;
/**
 * Checks for environment variables with details of
 * an OpenWhisk instance.
 *
 * If environment variables are found, a single test
 * GET request is made to make sure that the
 * environment variables are good.
 *
 * @returns true - if the OpenWhisk functions are ready to use
 *         false - if there are no environment variables, or
 *                  the environment variables did not work
 */
async function pingOpenWhisk() {
    if (process.env[env.SERVERLESS_OPENWHISK_KEY] &&
        process.env[env.SERVERLESS_OPENWHISK_URL]) {
        const url = getUrl(exports.FUNCTIONS.TEST);
        const headers = getHeaders();
        try {
            const response = await request({
                url,
                json: true,
                headers: Object.assign(Object.assign({}, headers), { 'Accept': 'application/json', 'User-Agent': 'machinelearningforkids.co.uk' }),
            });
            if (response.ok === true) {
                log.info('Using OpenWhisk for expensive functions');
                return true;
            }
            log.error({ response }, 'Failed to verify OpenWhisk environment');
            return false;
        }
        catch (err) {
            log.error({ err }, 'Invalid OpenWhisk environment');
            return false;
        }
    }
    log.info('Running all functions locally');
    return Promise.resolve(false);
}
async function isOpenWhiskConfigured() {
    if (executionType === 'unknown') {
        const useOpenwhisk = await pingOpenWhisk();
        executionType = useOpenwhisk ? 'openwhisk' : 'local';
        return executionType === 'openwhisk';
    }
    return Promise.resolve(executionType === 'openwhisk');
}
exports.isOpenWhiskConfigured = isOpenWhiskConfigured;
