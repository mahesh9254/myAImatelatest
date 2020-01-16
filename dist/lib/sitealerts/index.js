"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const store = require("../db/store");
const Types = require("../db/site-alerts");
/* To avoid having to refetch the latest alert, we fetch it    */
/*  once and then reuse that. The cache needs to be explicitly */
/*  told to refresh.                                           */
let cachedAlert;
function getSiteAlert(usertype) {
    if (cachedAlert) {
        // we have an alert
        // is the alert still valid?
        if (Date.now() > cachedAlert.expiry.getTime()) {
            // site alert has expired - clear it
            cachedAlert = undefined;
            return;
        }
        // is the alert relevant to the user type?
        if (isAlertRelevant(usertype, cachedAlert.audience)) {
            return cachedAlert;
        }
    }
    // else
    // nothing to return - no cached alert
}
exports.getSiteAlert = getSiteAlert;
function isAlertRelevant(audience, alertAudience) {
    return Types.audiencesByLabel[audience].id >= Types.audiencesByLabel[alertAudience].id;
}
exports.isAlertRelevant = isAlertRelevant;
async function refreshCache() {
    cachedAlert = await store.getLatestSiteAlert();
    return cachedAlert;
}
exports.refreshCache = refreshCache;
