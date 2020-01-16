"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const mysql = require("mysql2/promise");
// local dependencies
const env = require("../utils/env");
let connectionPool;
async function connect() {
    if (!connectionPool) {
        connectionPool = await mysql.createPool({
            connectionLimit: 30,
            host: process.env[env.MYSQLHOST],
            port: process.env[env.MYSQLPORT],
            user: process.env[env.MYSQLUSER],
            password: process.env[env.MYSQLPASSWORD],
            database: process.env[env.MYSQLDATABASE],
        });
    }
    return connectionPool;
}
exports.connect = connect;
async function disconnect() {
    if (connectionPool) {
        await connectionPool.end();
        connectionPool = undefined;
    }
}
exports.disconnect = disconnect;
