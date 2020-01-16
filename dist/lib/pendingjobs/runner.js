"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const db = require("../db/store");
const processor = require("./processor");
const notifications = require("../notifications/slack");
const constants = require("../utils/constants");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
async function run() {
    let nextJob;
    try {
        const start = new Date();
        nextJob = await db.getNextPendingJob();
        while (nextJob) {
            await processor.processJob(nextJob);
            await db.deletePendingJob(nextJob);
            nextJob = await db.getNextPendingJob();
        }
        const end = new Date();
        const durationMs = end.getTime() - start.getTime();
        log.info({ durationMs }, 'No pending jobs remain');
        if (durationMs > constants.THREE_HOURS) {
            notifications.notify('Processing pending jobs took longer than THREE HOURS', notifications.SLACK_CHANNELS.CRITICAL_ERRORS);
        }
    }
    catch (err) {
        log.error({ err, nextJob }, 'Pending job failure');
        notifications.notify('Critical failure in processing pending jobs: ' + err.message, notifications.SLACK_CHANNELS.CRITICAL_ERRORS);
        if (nextJob) {
            db.recordUnsuccessfulPendingJobExecution(nextJob);
        }
    }
}
exports.run = run;
