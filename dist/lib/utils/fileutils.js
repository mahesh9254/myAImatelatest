"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const fs = require("fs");
function read(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, contents) => {
            if (err) {
                return reject(err);
            }
            return resolve(contents);
        });
    });
}
exports.read = read;
function readBuffer(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, contents) => {
            if (err) {
                return reject(err);
            }
            return resolve(contents);
        });
    });
}
exports.readBuffer = readBuffer;
function readJson(path) {
    return read(path)
        .then((textdata) => {
        return JSON.parse(textdata);
    });
}
exports.readJson = readJson;
