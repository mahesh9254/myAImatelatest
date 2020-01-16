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
    app.get(urls.IMAGE, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, // makes sure that the project exists
    handleDownload);
}
exports.default = registerApis;
async function handleDownload(req, res) {
    try {
        const image = await store.getImage(parse.imageUrl(req));
        //
        // set headers dynamically based on the image we've fetched
        //
        res.setHeader('Content-Type', image.filetype);
        if (image.modified) {
            res.setHeader('Last-Modified', image.modified);
        }
        if (image.etag) {
            res.setHeader('ETag', image.etag);
        }
        // This is slow, so encourage browsers to aggressively
        //  cache the images rather than repeatedly download them
        // (This is safe as we don't allow images to be modified,
        //  so it's okay to treat them as immutable).
        res.set(headers.CACHE_1YEAR);
        res.send(image.body);
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
