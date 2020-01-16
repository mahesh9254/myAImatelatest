"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const webhook_1 = require("@slack/webhook");
// local dependencies
const env = require("../utils/env");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
let webhook;
function init() {
    const slackUrl = process.env[env.SLACK_WEBHOOK_URL];
    if (slackUrl) {
        webhook = new webhook_1.IncomingWebhook(slackUrl);
    }
}
exports.init = init;
function notify(text, channel) {
    if (webhook) {
        webhook.send({ text, channel })
            .then((res) => {
            log.debug({ res }, 'Sent notification');
        })
            .catch((err) => {
            log.error({ err }, 'Failed to send notification');
        });
    }
}
exports.notify = notify;
function close() {
    if (webhook) {
        webhook = undefined;
    }
}
exports.close = close;
exports.SLACK_CHANNELS = {
    ERRORS: 'errors',
    PASSWORD_RESET: 'password-resets',
    CREDENTIALS: 'credentials-check',
    CLASS_CREATE: 'new-classes',
    CLASS_DELETE: 'deleted-classes',
    CRITICAL_ERRORS: 'critical-errors',
    TRAINING_ERRORS: 'training-errors',
    UI_ERRORS: 'sentry',
    SESSION_USERS: 'session-users',
};
