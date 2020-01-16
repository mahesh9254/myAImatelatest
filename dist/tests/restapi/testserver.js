"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const restapi_1 = require("../../lib/restapi");
function setup() {
    const app = express();
    restapi_1.default(app);
    return app;
}
exports.default = setup;
