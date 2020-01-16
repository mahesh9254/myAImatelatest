"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const store = require("../db/store");
/*
 * "Session Users" are temporary users, who are provided short-term access to
 *  use the site, without needing to register or provide any contact details /
 *  identification.
 *
 * A system class (named in @CLASS_NAME) is created in the tenants DB table, so
 *  limits that apply to session users can be modified at runtime by updating
 *  this class.
 */
exports.CLASS_NAME = 'session-users';
const SESSION_LIFESPAN = 4 * 60 * 60 * 1000; // 4 hours
/** The number of users that can be created in this class. After this, the class is considered full.  */
const MAX_ALLOWED_USERS = 900;
exports.ERROR_MESSAGES = {
    CLASS_FULL: 'Class full',
};
async function createSessionUser() {
    // is the session class full?
    const currentClassSize = await store.countTemporaryUsers();
    if (currentClassSize >= MAX_ALLOWED_USERS) {
        throw new Error(exports.ERROR_MESSAGES.CLASS_FULL);
    }
    const user = await store.storeTemporaryUser(SESSION_LIFESPAN);
    return user;
}
exports.createSessionUser = createSessionUser;
async function checkSessionToken(id, token) {
    const sessionuser = await store.getTemporaryUser(id);
    if (!sessionuser) {
        // user not known (may have expired, been explicitly deleted, or never existed)
        return false;
    }
    if (sessionuser.token !== token) {
        // invalid token
        return false;
    }
    if (sessionuser.sessionExpiry < new Date()) {
        // session expired
        return false;
    }
    // all checks passed - welcome
    return true;
}
exports.checkSessionToken = checkSessionToken;
async function deleteSessionUser(user) {
    await store.deleteEntireUser(user.id, exports.CLASS_NAME);
    await store.deleteTemporaryUser(user);
}
exports.deleteSessionUser = deleteSessionUser;
async function cleanupExpiredSessionUsers() {
    // first batch of users to delete
    let expiredUsers = await store.getExpiredTemporaryUsers();
    while (expiredUsers.length > 0) {
        // delete resources for each expired user
        for (const expiredUser of expiredUsers) {
            await store.deleteEntireUser(expiredUser.id, exports.CLASS_NAME);
        }
        // delete the expired users
        await store.bulkDeleteTemporaryUsers(expiredUsers);
        // get next batch of users to delete
        expiredUsers = await store.getExpiredTemporaryUsers();
    }
}
exports.cleanupExpiredSessionUsers = cleanupExpiredSessionUsers;
