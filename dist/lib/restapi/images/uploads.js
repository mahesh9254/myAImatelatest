"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const httpStatus = require("http-status");
// local dependencies
const auth = require("../auth");
const config = require("../../objectstore/config");
const store = require("../../objectstore");
const db = require("../../db/store");
const urls = require("../urls");
const parse = require("./urlparse");
const logger_1 = require("../../utils/logger");
const log = logger_1.default();
let uploadHandler;
/**
 * Sets up API required to allow image uploads.
 */
function registerApis(app) {
    // init image uploads request handler
    uploadHandler = prepareMulterUploadHandler();
    // register route handler
    app.post(urls.IMAGES, auth.authenticate, auth.checkValidUser, auth.verifyProjectAccess, 
    // @ts-ignore
    handleUpload);
}
exports.default = registerApis;
function handleUpload(req, res) {
    if (!uploadHandler) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            error: 'Server not initialised',
            details: 'Multer upload handler undefined',
        });
    }
    // make sure this is an images project before we proceed
    if (req.project.type !== 'images') {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: 'Only images projects allow image uploads',
        });
    }
    uploadHandler(req, res, async (err) => {
        if (err) {
            return returnUploadError(res, err);
        }
        if (!req.file) {
            return res.status(httpStatus.BAD_REQUEST).json({
                error: 'File not provided',
            });
        }
        if (!req.body ||
            !req.body.label ||
            typeof req.body.label !== 'string' ||
            req.body.label.trim().length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({
                error: 'Image label not provided',
            });
        }
        if (req.project.labels.includes(req.body.label) === false) {
            return res.status(httpStatus.BAD_REQUEST).json({
                error: 'Unrecognised label',
            });
        }
        let imageSpec;
        let etag;
        try {
            imageSpec = parse.imagesUrl(req);
            const imageType = getImageType(req.file.mimetype);
            const imageLabel = req.body.label.trim();
            etag = await store.storeImage(imageSpec, imageType, req.file.buffer);
            const training = await db.storeImageTraining(imageSpec.projectid, parse.createImageUrl(imageSpec), imageLabel, true, imageSpec.objectid);
            if (etag) {
                res.setHeader('ETag', etag);
            }
            res.status(httpStatus.CREATED).json(training);
        }
        catch (storeErr) {
            if (imageSpec && etag && storeErr &&
                storeErr.message === 'Project already has maximum allowed amount of training data') {
                // we've already stored the image data in objectstorage, but
                //  we failed to store the info about the image in MySQL as
                //  the user has reached the project limit
                // so we need to delete the image from image data again
                //  (but we'll do that in the background rather than synchronously)
                removeStoredImage(imageSpec);
                return res.status(httpStatus.CONFLICT).json({
                    error: 'Project already has maximum allowed amount of training data',
                });
            }
            log.error({ err: storeErr, projectid: req.project.id }, 'Store fail');
            res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
                error: storeErr.message,
                details: storeErr,
            });
        }
    });
}
function getImageType(mimetype) {
    if (config.SUPPORTED_IMAGE_MIMETYPES.includes(mimetype)) {
        return mimetype;
    }
    log.error({ mimetype }, 'Unexpected mime type');
    return '';
}
function imageTypesFilter(req, file, cb) {
    if (config.SUPPORTED_IMAGE_MIMETYPES.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Unsupported file type ' + file.mimetype), false);
    }
}
function prepareMulterUploadHandler() {
    const inMemory = multer.memoryStorage();
    return multer({
        limits: {
            fileSize: config.MAX_IMAGE_FILESIZE_BYTES,
            files: 1,
        },
        fileFilter: imageTypesFilter,
        storage: inMemory,
    }).single('image');
}
function returnUploadError(res, err) {
    if (err.message === 'File too large') {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: 'File too large',
            details: 'Limit : ' + config.MAX_IMAGE_FILESIZE_BYTES,
        });
    }
    if (err.message.startsWith('Unsupported file type ')) {
        return res.status(httpStatus.BAD_REQUEST).json({
            error: err.message,
        });
    }
    log.error({ err }, 'Unexpected error');
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        error: err.message,
        details: err,
    });
}
function removeStoredImage(image) {
    db.storeDeleteObjectJob(image.classid, image.userid, image.projectid, image.objectid)
        .catch((err) => {
        log.error({ err, image }, 'Failed to clean-up image');
    });
}
