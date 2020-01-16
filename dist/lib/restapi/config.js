"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const express = require("express");
const httpstatus = require("http-status");
const path = require("path");
const compression = require("compression");
// local dependencies
const constants = require("../utils/constants");
function setupForBluemix(app) {
    if (process.env.BLUEMIX_REGION) {
        // when running on Bluemix, need to look at use of HTTPS
        //  between browser and Bluemix (not between Bluemix proxy
        //  and the express app)
        app.enable('trust proxy');
        app.use((req, res, next) => {
            if (req.secure) {
                next();
            }
            else {
                res.redirect(httpstatus.MOVED_PERMANENTLY, 'https://' + req.headers.host + req.url);
            }
        });
        // when running on Bluemix, need to force non-www URLs as
        //  the auth-callbacks won't support use of www
        app.get('/*', (req, res, next) => {
            if (req.hostname.startsWith('www.')) {
                const host = req.headers.host;
                res.redirect(httpstatus.MOVED_PERMANENTLY, 'https://' + host.substr(4) + req.url);
            }
            else {
                next();
            }
        });
    }
}
exports.setupForBluemix = setupForBluemix;
function setupUI(app) {
    const uilocation = path.join(__dirname, '/../../../web/static');
    app.use('/static', compression(), express.static(uilocation, { maxAge: constants.ONE_YEAR }));
    const scratchxlocation = path.join(__dirname, '/../../../web/scratchx');
    app.use('/scratchx', compression(), express.static(scratchxlocation, { maxAge: constants.ONE_WEEK }));
    const scratch3location = path.join(__dirname, '/../../../web/scratch3');
    app.use('/scratch3', compression(), express.static(scratch3location, { maxAge: constants.ONE_WEEK }));
    const datasetslocation = path.join(__dirname, '/../../../web/datasets');
    app.use('/datasets', compression(), express.static(datasetslocation, { maxAge: constants.ONE_WEEK }));
    app.get('/about', (req, res) => { res.redirect('/#!/about'); });
    app.get('/projects', (req, res) => { res.redirect('/#!/projects'); });
    app.get('/news', (req, res) => { res.redirect('/#!/news'); });
    app.get('/teacher', (req, res) => { res.redirect('/#!/teacher'); });
    app.get('/worksheets', (req, res) => { res.redirect('/#!/worksheets'); });
    app.get('/help', (req, res) => { res.redirect('/#!/help'); });
    app.get('/signup', (req, res) => { res.redirect('/#!/signup'); });
    app.get('/login', (req, res) => { res.redirect('/#!/login'); });
    app.get('/apikeys-guide', (req, res) => { res.redirect('/#!/apikeys-guide'); });
    const indexHtml = path.join(__dirname, '/../../../web/dynamic');
    app.use('/', express.static(indexHtml, { maxAge: 0 }));
}
exports.setupUI = setupUI;
