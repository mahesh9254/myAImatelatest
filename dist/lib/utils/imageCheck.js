"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// core dependencies
const fs = require("fs");
// external dependencies
const fileType = require("file-type");
const read_chunk_1 = require("read-chunk");
const tmp = require("tmp");
const async = require("async");
const filesize = require("filesize");
// local dependencies
const download = require("./download");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
exports.ERROR_PREFIXES = {
    BAD_TYPE: 'Unsupported file type',
    TOO_BIG: 'Image file size',
};
function verifyImage(url, maxAllowedSizeBytes) {
    return new Promise((resolve, reject) => {
        async.waterfall([
            (next) => {
                // work out where to download the file to
                tmp.file({ keep: true, discardDescriptor: true, prefix: 'chk-' }, (err, tmppath) => {
                    if (err) {
                        log.error({ err, url }, 'Failed to create tmp file');
                    }
                    next(err, tmppath);
                });
            },
            (tmpFilePath, next) => {
                // download the file to the temp location on disk
                download.file(url, tmpFilePath, (err) => {
                    if (err) {
                        log.warn({ err, tmpFilePath, url }, 'Failed to download image file');
                    }
                    next(err, tmpFilePath);
                });
            },
            (tmpFilePath, next) => {
                // check that the file isn't too big
                fs.stat(tmpFilePath, (err, stats) => {
                    if (err) {
                        log.error({ err, url }, 'Failed to check image file size');
                        return next(err);
                    }
                    if (stats.size > maxAllowedSizeBytes) {
                        return next(new Error(exports.ERROR_PREFIXES.TOO_BIG +
                            ' (' + filesize(stats.size) + ') ' +
                            'is too big. Please choose images smaller than ' +
                            filesize(maxAllowedSizeBytes)));
                    }
                    return next(err, tmpFilePath);
                });
            },
            (tmpFilePath, next) => {
                // sniff the start of the file to work out the file type
                getFileTypeFromContents(tmpFilePath, (err, type) => {
                    if (err) {
                        log.error({ err, url, tmpFilePath }, 'Failed to get file type');
                    }
                    next(err, tmpFilePath, type);
                });
            },
        ], (err, tmpFilePath, fileTypeExt) => {
            if (tmpFilePath) {
                fs.unlink(tmpFilePath, logError);
            }
            if (err) {
                return reject(err);
            }
            const isOkay = (fileTypeExt === 'jpg') || (fileTypeExt === 'png');
            if (!isOkay) {
                return reject(new Error(exports.ERROR_PREFIXES.BAD_TYPE + ' (' + fileTypeExt + '). ' +
                    'Only jpg and png images are supported.'));
            }
            return resolve();
        });
    });
}
exports.verifyImage = verifyImage;
/**
 * Returns the type of the file at the specified location.
 */
function getFileTypeFromContents(filepath, callback) {
    read_chunk_1.default(filepath, 0, 4100)
        .then((buffer) => {
        const type = fileType(buffer);
        callback(undefined, type ? type.ext : 'unknown');
    })
        .catch(callback);
}
function logError(err) {
    if (err) {
        log.error({ err }, 'Failure to delete a temp file');
    }
}
