"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const uuid = require("uuid/v4");
// local dependencies
const env = require("../utils/env");
const AUTH0_CLIENT_SECRET = process.env[env.AUTH0_CLIENT_SECRET] ?
    process.env[env.AUTH0_CLIENT_SECRET] :
    uuid();
const AUTH0_DOMAIN = process.env[env.AUTH0_DOMAIN] ?
    process.env[env.AUTH0_DOMAIN] :
    uuid();
const AUTH0_CUSTOM_DOMAIN = process.env[env.AUTH0_CUSTOM_DOMAIN] ?
    process.env[env.AUTH0_CUSTOM_DOMAIN] :
    uuid();
const AUTH0_AUDIENCE = process.env[env.AUTH0_AUDIENCE] ?
    process.env[env.AUTH0_AUDIENCE] :
    uuid();
const AUTH0_API_CLIENTID = process.env[env.AUTH0_API_CLIENTID] ?
    process.env[env.AUTH0_API_CLIENTID] :
    uuid();
const AUTH0_API_CLIENTSECRET = process.env[env.AUTH0_API_CLIENTSECRET] ?
    process.env[env.AUTH0_API_CLIENTSECRET] :
    uuid();
exports.CLIENT_SECRET = AUTH0_CLIENT_SECRET;
exports.DOMAIN = AUTH0_DOMAIN;
exports.CUSTOM_DOMAIN = AUTH0_CUSTOM_DOMAIN;
exports.AUDIENCE = AUTH0_AUDIENCE;
exports.API_CLIENTID = AUTH0_API_CLIENTID;
exports.API_CLIENTSECRET = AUTH0_API_CLIENTSECRET;
