"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const express = require("express");
// local dependencies
const store = require("./db/store");
const objectstore = require("./objectstore");
const iamcache = require("./iam");
const sitealerts = require("./sitealerts");
const restapi_1 = require("./restapi");
const slack = require("./notifications/slack");
const email = require("./notifications/email");
const scheduledtasks = require("./scheduledtasks");
const env_1 = require("./utils/env");
const shutdown = require("./utils/shutdown");
const port_1 = require("./utils/port");
const logger_1 = require("./utils/logger");
const log = logger_1.default();
// do this before doing anything!
env_1.confirmRequiredEnvironment();
// log any uncaught errors before crashing
process.on('uncaughtException', shutdown.crash);
// terminate quickly if Cloud Foundry sends a SIGTERM signal
process.on('SIGTERM', shutdown.now);
process.on('SIGINT', shutdown.now);
// prepare Slack API for reporting alerts
slack.init();
// prepare SMTP pool for sending notification emails
email.init();
// connect to S3 object storage used to store images and sounds
objectstore.init();
// initialise the cache for tokens from Bluemix IAM
iamcache.init();
// connect to MySQL DB
store.init()
    .then(() => {
    // check for current site alerts
    sitealerts.refreshCache();
    // create server
    const app = express();
    const host = process.env.HOST || '0.0.0.0';
    const port = port_1.default(process.env.PORT, 8000);
    // setup server and run
    restapi_1.default(app);
    app.listen(port, host, () => {
        log.info({ host, port }, 'Running');
    });
    // start scheduled cleanup tasks
    scheduledtasks.run();
});
