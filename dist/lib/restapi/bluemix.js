"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function ping(req, res) {
    res.json({});
}
/**
 * Sets up APIs required to run in Bluemix.
 */
function registerApis(app) {
    app.get('/api', ping);
}
exports.default = registerApis;
