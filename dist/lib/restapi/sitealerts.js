"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpstatus = require("http-status");
// local dependencies
const errors = require("./errors");
const urls = require("./urls");
const auth = require("./auth");
const store = require("../db/store");
const sitealerts = require("../sitealerts");
const headers = require("./headers");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
function createSiteAlert(req, res) {
    if (!req.body ||
        !req.body.message || !req.body.audience ||
        !req.body.severity || !req.body.expiry) {
        return res.status(httpstatus.BAD_REQUEST)
            .send({ error: 'Missing required field' });
    }
    store.storeSiteAlert(req.body.message, req.body.url, req.body.audience, req.body.severity, req.body.expiry)
        .then(() => {
        return sitealerts.refreshCache();
    })
        .then((alert) => {
        return res.json(alert);
    })
        .catch((err) => {
        if (err.statusCode === httpstatus.BAD_REQUEST) {
            return res.status(httpstatus.BAD_REQUEST).json({ error: err.message });
        }
        log.error({ err, func: 'createSiteAlert' }, 'Server error');
        errors.unknownError(res, err);
    });
}
function refreshSiteAlertCache(req, res) {
    sitealerts.refreshCache()
        .then((alert) => {
        return res.json(Object.assign(Object.assign({}, alert), { instance: process.env.CF_INSTANCE_INDEX }));
    })
        .catch((err) => {
        log.error({ err, func: 'refreshSiteAlertCache' }, 'Server error');
        errors.unknownError(res, err);
    });
}
function getSiteAlert(type, req, res) {
    const alert = sitealerts.getSiteAlert(type);
    res.set(headers.CACHE_1MINUTE);
    if (alert) {
        return res.json([alert]);
    }
    else {
        return res.json([]);
    }
}
function getPublicSiteAlerts(req, res) {
    getSiteAlert('public', req, res);
}
function getStudentSiteAlerts(req, res) {
    getSiteAlert('student', req, res);
}
function getTeacherSiteAlerts(req, res) {
    getSiteAlert('supervisor', req, res);
}
function registerApis(app) {
    app.post(urls.SITEALERTS, auth.authenticate, auth.checkValidUser, auth.requireSiteAdmin, createSiteAlert);
    app.put(urls.SITEALERTS_REFRESH, auth.authenticate, auth.checkValidUser, auth.requireSiteAdmin, refreshSiteAlertCache);
    app.get(urls.SITEALERTS_PUBLIC, getPublicSiteAlerts);
    app.get(urls.SITEALERTS_STUDENT, auth.authenticate, auth.checkValidUser, getStudentSiteAlerts);
    app.get(urls.SITEALERTS_TEACHER, auth.authenticate, auth.checkValidUser, auth.requireSupervisor, getTeacherSiteAlerts);
}
exports.default = registerApis;
