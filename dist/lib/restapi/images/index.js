"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const uploads_1 = require("./uploads");
const downloads_1 = require("./downloads");
function registerApis(app) {
    uploads_1.default(app);
    downloads_1.default(app);
}
exports.default = registerApis;
