"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpstatus = require("http-status");
// local dependencies
const logger_1 = require("../utils/logger");
const log = logger_1.default();
function missingData(res) {
    return res.status(httpstatus.BAD_REQUEST).json({ error: 'Missing data' });
}
exports.missingData = missingData;
function notFound(res) {
    return res.status(httpstatus.NOT_FOUND).json({ error: 'Not found' });
}
exports.notFound = notFound;
function notAuthorised(res) {
    return res.status(httpstatus.UNAUTHORIZED).json({ error: 'Not authorised' });
}
exports.notAuthorised = notAuthorised;
function forbidden(res) {
    return res.status(httpstatus.FORBIDDEN).json({ error: 'Invalid access' });
}
exports.forbidden = forbidden;
function supervisorOnly(res) {
    return res.status(httpstatus.FORBIDDEN).json({ error: 'Only supervisors are allowed to invoke this' });
}
exports.supervisorOnly = supervisorOnly;
function requestTooLarge(res) {
    return res.status(httpstatus.REQUEST_ENTITY_TOO_LARGE).json({ error: 'Payload too large' });
}
exports.requestTooLarge = requestTooLarge;
function notImplemented(res) {
    return res.status(httpstatus.NOT_IMPLEMENTED).json({ error: 'Not implemented' });
}
exports.notImplemented = notImplemented;
function unknownError(res, err) {
    if (err && err.sqlState) {
        err = {
            error: 'Error accessing the database used to store data',
            detail: {
                code: err.code,
                errno: err.errno,
                sqlState: err.sqlState,
                message: err.message,
            },
        };
    }
    else if (err && err.message) {
        err = { error: err.message };
    }
    else if (!err || Object.keys(err).length === 0) {
        err = { error: 'Unknown error' };
    }
    return res.status(httpstatus.INTERNAL_SERVER_ERROR).json(err);
}
exports.unknownError = unknownError;
function registerErrorHandling(app) {
    app.use((err, req, res, next) => {
        if (err) {
            if (err.name === 'UnauthorizedError') {
                return notAuthorised(res);
            }
            if (err.name === 'PayloadTooLargeError') {
                return requestTooLarge(res);
            }
            log.error({ err, url: req.url }, 'Unhandled exception');
        }
        next(err);
    });
}
exports.registerErrorHandling = registerErrorHandling;
function register404Handler(app) {
    app.use((req, res, next) => // eslint-disable-line no-unused-vars
     {
        log.info({ req, res }, '404');
        if (req.accepts('html')) {
            res.redirect('/#!/404');
        }
        else {
            notFound(res);
        }
    });
}
exports.register404Handler = register404Handler;
