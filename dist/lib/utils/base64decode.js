"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// core dependencies
const fs = require("fs");
// external dependencies
const tmp = require("tmp");
const logger_1 = require("./logger");
const log = logger_1.default();
function decodeJpg(base64data, callback) {
    tmp.file({
        keep: true,
        discardDescriptor: true,
        prefix: 'b64-',
        postfix: '.jpg',
    }, (err, filepath) => {
        if (err) {
            return callback(err);
        }
        return fs.writeFile(filepath, base64data, 'base64', ((writeerr) => {
            callback(writeerr, filepath);
        }));
    });
}
function run(base64data) {
    return new Promise((resolve, reject) => {
        decodeJpg(base64data, (err, filepath) => {
            if (err) {
                log.error({ err, filepath }, 'Failed to decode data');
                return reject(err);
            }
            return resolve(filepath);
        });
    });
}
exports.run = run;
