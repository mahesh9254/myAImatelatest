"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const httpstatus = require("http-status");
// local dependencies
const errors = require("./errors");
const urls = require("./urls");
const auth = require("./auth");
const sessionusers = require("../sessionusers");
const notifications = require("../notifications/slack");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
function createSessionUser(req, res) {
    sessionusers.createSessionUser()
        .then((user) => {
        return res.status(httpstatus.CREATED).json({
            id: user.id,
            token: user.token,
            sessionExpiry: user.sessionExpiry,
            jwt: auth.generateJwt(user),
        });
    })
        .catch((err) => {
        log.error({ err }, 'Failed to create session user');
        notifications.notify('Failed to create "Try it now" session : ' + err.message, notifications.SLACK_CHANNELS.CRITICAL_ERRORS);
        if (err.message === sessionusers.ERROR_MESSAGES.CLASS_FULL) {
            return res.status(httpstatus.PRECONDITION_FAILED).json({ error: err.message });
        }
        else {
            return errors.unknownError(res, err);
        }
    });
}
function deleteSessionUser(req, res) {
    const userid = req.params.studentid;
    if (req.user.sub !== userid) {
        // attempt to delete a different session user
        return errors.forbidden(res);
    }
    if (!(req.user.session &&
        req.user.session.id && req.user.session.token && req.user.session.sessionExpiry)) {
        // missing information about the user
        return errors.missingData(res);
    }
    const userToDelete = {
        id: req.user.session.id,
        token: req.user.session.token,
        sessionExpiry: req.user.session.sessionExpiry,
    };
    sessionusers.deleteSessionUser(userToDelete)
        .then(() => {
        res.sendStatus(httpstatus.NO_CONTENT);
    })
        .catch((err) => {
        errors.unknownError(res, err);
    });
}
function registerApis(app) {
    // API for creating new try-it-now accounts so
    //  this API can't be an authenticated one
    app.post(urls.SESSION_USERS, createSessionUser);
    app.delete(urls.SESSION_USER, auth.authenticate, auth.checkValidUser, 
    // @ts-ignore
    deleteSessionUser);
}
exports.default = registerApis;
