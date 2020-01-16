"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpStatus = require("http-status");
// local dependencies
const auth = require("../auth");
const store = require("../../objectstore");
const parse = require("./urlparse");
const urls = require("../urls");
const headers = require("../headers");
/**
 * Sets up API required to allow image downloads.
 */
function registerApis(app) {
    // register route handler
    app.get(urls.SOUND, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, // makes sure that the project exists
    handleDownload);
}
exports.default = registerApis;
async function handleDownload(req, res) {
    try {
        const sound = await store.getSound(parse.soundUrl(req));
        if (sound.modified) {
            res.setHeader('Last-Modified', sound.modified);
        }
        if (sound.etag) {
            res.setHeader('ETag', sound.etag);
        }
        // This is slow, so encourage browsers to aggressively
        //  cache the spectrograms rather than repeatedly download them
        // (This is safe as we don't allow sound data to be modified,
        //  so it's okay to treat them as immutable).
        res.set(headers.CACHE_1YEAR);
        res.json(sound.body);
    }
    catch (err) {
        return returnDownloadError(res, err);
    }
}
function returnDownloadError(res, err) {
    if (err.message === 'The specified key does not exist.') {
        return res.status(httpStatus.NOT_FOUND).json({
            error: 'File not found',
        });
    }
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: err.message,
        details: err,
    });
}
