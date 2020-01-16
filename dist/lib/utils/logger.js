"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// global dependencies
const bunyan = require("bunyan");
const bunyanSlack = require("bunyan-slack");
// local dependencies
const env = require("../utils/env");
let logger;
/**
 * Prepares an instance of a bunyan login.
 */
function getLogger() {
    if (!logger) {
        const options = {
            name: 'ml-for-kids',
            serializers: bunyan.stdSerializers,
        };
        if (process.env.NODE_ENV === 'production') {
            options.streams = [
                // writing the logs to stdout/stderr so that
                //  they can be picked up by Bluemix Log Service
                {
                    level: bunyan.ERROR,
                    stream: process.stderr,
                },
                {
                    level: bunyan.INFO,
                    stream: process.stdout,
                },
            ];
            if (process.env[env.SLACK_WEBHOOK_URL]) {
                // post errors to Slack so I get notified
                const slackLogger = new bunyanSlack({
                    webhook_url: process.env[env.SLACK_WEBHOOK_URL],
                    channel: 'errors',
                    customFormatter: (record, levelName) => {
                        return {
                            text: record.msg,
                            attachments: [{
                                    fallback: 'Error meta-data',
                                    color: levelName === 'error' ? '#c42939' : '#36a64f',
                                    author_name: 'bunyan',
                                    title: 'Error fields',
                                    fields: Object.keys(record).map((field) => {
                                        return {
                                            title: field,
                                            value: field === 'err' ? record.err.stack : record[field],
                                            short: field !== 'err',
                                        };
                                    }),
                                }],
                        };
                    },
                });
                options.streams.push({
                    level: bunyan.ERROR,
                    stream: slackLogger,
                });
            }
        }
        else {
            options.src = true;
            options.streams = [{
                    level: bunyan.DEBUG,
                    type: 'rotating-file',
                    path: './logs/ml-for-kids.log',
                    period: '1d',
                    count: 2,
                }];
        }
        logger = bunyan.createLogger(options);
    }
    return logger;
}
exports.default = getLogger;
