"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const deployment = require("./deployment");
exports.OBJECT_STORE_CREDS = 'OBJECT_STORE_CREDS';
exports.OBJECT_STORE_BUCKET = 'OBJECT_STORE_BUCKET';
exports.AUTH0_DOMAIN = 'AUTH0_DOMAIN';
exports.AUTH0_CUSTOM_DOMAIN = 'AUTH0_CUSTOM_DOMAIN';
exports.AUTH0_CONNECTION = 'AUTH0_CONNECTION';
exports.AUTH0_CLIENT_SECRET = 'AUTH0_CLIENT_SECRET';
exports.AUTH0_CALLBACK_URL = 'AUTH0_CALLBACK_URL';
exports.AUTH0_API_CLIENTID = 'AUTH0_API_CLIENTID';
exports.AUTH0_API_CLIENTSECRET = 'AUTH0_API_CLIENTSECRET';
exports.AUTH0_AUDIENCE = 'AUTH0_AUDIENCE';
exports.MYSQLHOST = 'MYSQLHOST';
exports.MYSQLPORT = 'MYSQLPORT';
exports.MYSQLUSER = 'MYSQLUSER';
exports.MYSQLPASSWORD = 'MYSQLPASSWORD';
exports.MYSQLDATABASE = 'MYSQLDATABASE';
exports.NUMBERS_SERVICE = 'NUMBERS_SERVICE';
exports.NUMBERS_SERVICE_USER = 'NUMBERS_SERVICE_USER';
exports.NUMBERS_SERVICE_PASS = 'NUMBERS_SERVICE_PASS';
exports.SLACK_WEBHOOK_URL = 'SLACK_WEBHOOK_URL';
exports.PRIMARY_INSTANCE = 'PRIMARY_INSTANCE';
exports.SMTP_HOST = 'SMTP_HOST';
exports.SMTP_PORT = 'SMTP_PORT';
exports.SMTP_USER = 'SMTP_USER';
exports.SMTP_PASS = 'SMTP_PASS';
exports.SMTP_REPLY_TO = 'SMTP_REPLY_TO';
exports.SERVERLESS_OPENWHISK_URL = 'SERVERLESS_OPENWHISK_URL';
exports.SERVERLESS_OPENWHISK_KEY = 'SERVERLESS_OPENWHISK_KEY';
const DEFAULT = [
    exports.MYSQLHOST, exports.MYSQLPORT, exports.MYSQLUSER, exports.MYSQLDATABASE,
];
const PROD = [
    exports.OBJECT_STORE_CREDS, exports.OBJECT_STORE_BUCKET,
    exports.AUTH0_DOMAIN, exports.AUTH0_CUSTOM_DOMAIN, exports.AUTH0_CONNECTION, exports.AUTH0_CLIENT_SECRET,
    exports.AUTH0_CALLBACK_URL, exports.AUTH0_API_CLIENTID, exports.AUTH0_API_CLIENTSECRET,
    exports.AUTH0_AUDIENCE,
    exports.MYSQLHOST, exports.MYSQLPORT, exports.MYSQLUSER, exports.MYSQLPASSWORD, exports.MYSQLDATABASE,
    exports.NUMBERS_SERVICE, exports.NUMBERS_SERVICE_USER, exports.NUMBERS_SERVICE_PASS,
    exports.SMTP_HOST, exports.SMTP_PORT, exports.SMTP_USER, exports.SMTP_PASS, exports.SMTP_REPLY_TO,
];
function confirmRequiredEnvironment() {
    if (deployment.isProdDeployment()) {
        PROD.forEach(checkEnv);
    }
    else {
        DEFAULT.forEach(checkEnv);
    }
}
exports.confirmRequiredEnvironment = confirmRequiredEnvironment;
function checkEnv(env) {
    if (!process.env[env]) {
        throw new Error('Missing required environment variable ' + env);
    }
}
