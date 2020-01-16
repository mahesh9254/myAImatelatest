"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const request = require("request-promise");
const authvalues = require("./values");
// NO LOGIC IN HERE!
//  PUTTING ONLY XHR REQUESTS IN ONE PLACE MAKES IT EASIER TO STUB OUT AUTH0 FOR TEST PURPOSES
//  ANYTHING THAT LOOKS LIKE APP LOGIC SHOULDN'T GO IN HERE AS IT WON'T BE TESTED AS MUCH
function getOauthToken() {
    const options = {
        method: 'POST',
        url: 'https://' + authvalues.DOMAIN + '/oauth/token',
        headers: { 'content-type': 'application/json' },
        json: true,
        body: {
            client_id: authvalues.API_CLIENTID,
            client_secret: authvalues.API_CLIENTSECRET,
            audience: 'https://' + authvalues.DOMAIN + '/api/v2/',
            grant_type: 'client_credentials',
        },
    };
    const resp = request.post(options);
    return resp;
}
exports.getOauthToken = getOauthToken;
async function getUser(token, userid) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users/' + userid,
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            fields: 'user_id,username,app_metadata',
        },
        json: true,
    };
    const user = await request.get(getoptions);
    return user;
}
exports.getUser = getUser;
/**
 * Returns the registered teacher for the specified class.
 *  If there is more than one supervisor for a class, only the
 *  first user account returned by Auth0 will be returned.
 */
async function getSupervisor(token, tenant) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            q: 'app_metadata.role:"supervisor" AND app_metadata.tenant:"' + tenant + '"',
            per_page: 1,
            search_engine: 'v3',
        },
        json: true,
    };
    return request.get(getoptions)
        .then((users) => {
        if (users.length > 0) {
            return users[0];
        }
    });
}
exports.getSupervisor = getSupervisor;
async function getSupervisors(token, batch, batchsize) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            q: 'app_metadata.role:"supervisor"',
            include_totals: true,
            page: batch,
            per_page: batchsize,
            search_engine: 'v3',
        },
        json: true,
    };
    const response = await request.get(getoptions);
    return {
        users: response.users,
        total: response.total,
    };
}
exports.getSupervisors = getSupervisors;
exports.PAGE_SIZE = 100;
async function getUsers(token, tenant, page) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            q: 'app_metadata.role:"student" AND app_metadata.tenant:"' + tenant + '"',
            per_page: exports.PAGE_SIZE,
            page,
            search_engine: 'v3',
        },
        json: true,
    };
    const users = await request.get(getoptions);
    return users;
}
exports.getUsers = getUsers;
async function getClassSupervisors(token, tenant) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            q: 'app_metadata.role:"supervisor" AND app_metadata.tenant:"' + tenant + '"',
            per_page: exports.PAGE_SIZE,
            search_engine: 'v3',
        },
        json: true,
    };
    const users = await request.get(getoptions);
    return users;
}
exports.getClassSupervisors = getClassSupervisors;
async function getUserCounts(token, tenant) {
    const getoptions = {
        method: 'GET',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        qs: {
            q: 'app_metadata.tenant:"' + tenant + '"',
            fields: 'id',
            include_fields: true,
            include_totals: true,
            search_engine: 'v3',
        },
        json: true,
    };
    const usersInfo = await request.get(getoptions);
    return usersInfo;
}
exports.getUserCounts = getUserCounts;
async function createUser(token, newuser) {
    const createoptions = {
        method: 'POST',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users',
        headers: {
            authorization: 'Bearer ' + token,
        },
        body: newuser,
        json: true,
    };
    const userInfo = await request.post(createoptions);
    return userInfo;
}
exports.createUser = createUser;
async function deleteUser(token, userid) {
    const deleteoptions = {
        method: 'DELETE',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users/' + userid,
        headers: {
            authorization: 'Bearer ' + token,
        },
    };
    await request.delete(deleteoptions);
}
exports.deleteUser = deleteUser;
async function modifyUser(token, userid, modifications) {
    const modifyoptions = {
        method: 'PATCH',
        url: 'https://' + authvalues.DOMAIN + '/api/v2/users/' + userid,
        headers: {
            authorization: 'Bearer ' + token,
        },
        body: modifications,
        json: true,
    };
    const userInfo = await request.patch(modifyoptions);
    return userInfo;
}
exports.modifyUser = modifyUser;
