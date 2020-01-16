"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store = require("./token-store");
function init() {
    store.init();
}
exports.init = init;
async function getAuthHeader(apikey) {
    const token = await store.getToken(apikey);
    return 'Bearer ' + token;
}
exports.getAuthHeader = getAuthHeader;
