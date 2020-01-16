"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store = require("../db/store");
const email = require("../notifications/email");
const logger_1 = require("./logger");
const log = logger_1.default();
/**
 * Cleanly shut down the application.
 */
function now() {
    email.close();
    store.disconnect()
        .then(() => {
        process.exit(0); // eslint-disable-line
    })
        .catch((err) => {
        log.error({ err }, 'Failure in stopping DB client');
        process.exit(-1); // eslint-disable-line
    });
}
exports.now = now;
/**
 * Immediately terminate after an uncaught exception.
 */
function crash(err) {
    log.error({ err, stack: err.stack }, 'Crash');
    process.exit(1); // eslint-disable-line
}
exports.crash = crash;
