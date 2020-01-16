"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpstatus = require("http-status");
// local dependencies
const errors = require("./errors");
const appinventor = require("../scratchx/appinventor");
const urls = require("./urls");
async function getAppInventorExtension(req, res) {
    const apikey = req.params.scratchkey;
    try {
        const extensionStream = await appinventor.getExtension(apikey);
        res.writeHead(httpstatus.OK, {
            'Content-Disposition': 'attachment; filename=ml4k.aix;',
        });
        extensionStream.pipe(res);
    }
    catch (err) {
        errors.unknownError(res, err);
    }
}
function registerApis(app) {
    app.get(urls.APPINVENTOR_EXTENSION, getAppInventorExtension);
}
exports.default = registerApis;
