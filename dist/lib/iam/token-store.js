"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const LRU = require("lru");
// internal dependencies
const tokens = require("./tokens");
const constants = require("../utils/constants");
let accessTokensCache;
function init() {
    accessTokensCache = new LRU({
        max: 500,
        // according to https://cloud.ibm.com/docs/iam?topic=iam-iamtoken_from_apikey#iamtoken_from_apikey
        //  tokens are only valid for 1 hour
        maxAge: constants.ONE_HOUR,
    });
}
exports.init = init;
async function getToken(apikey) {
    const token = getTokenFromCache(apikey);
    if (token) {
        return Promise.resolve(token);
    }
    const iamToken = await tokens.getAccessToken(apikey);
    accessTokensCache.set(apikey, iamToken);
    return iamToken.access_token;
}
exports.getToken = getToken;
function getTokenFromCache(apikey) {
    const token = accessTokensCache.get(apikey);
    if (token && token.expiry_timestamp > Date.now()) {
        return token.access_token;
    }
}
