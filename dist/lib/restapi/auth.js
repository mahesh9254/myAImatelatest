"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const jwtDecode = require("jwt-decode");
const jsonwebtoken = require("jsonwebtoken");
const httpstatus = require("http-status");
// local dependencies
const errors = require("./errors");
const store = require("../db/store");
const authvalues = require("../auth0/values");
const sessionusers = require("../sessionusers");
const JWT_SECRET = authvalues.CLIENT_SECRET;
function generateJwt(payload) {
    return jsonwebtoken.sign(payload, JWT_SECRET, {
        algorithm: 'HS256',
    });
}
exports.generateJwt = generateJwt;
/**
 * Auth middleware for all normal users - who are authenticated by Auth0.
 */
const auth0Authenticate = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://' + authvalues.DOMAIN + '/.well-known/jwks.json',
    }),
    // cf. https://github.com/auth0/express-jwt/issues/171#issuecomment-305876709
    // audience : process.env[env.AUTH0_AUDIENCE],
    aud: authvalues.AUDIENCE,
    issuer: 'https://' + authvalues.CUSTOM_DOMAIN + '/',
    algorithms: ['RS256'],
});
/**
 * Auth middleware for users in the session-users class - who are authenticated locally.
 */
async function sessionusersAuthenticate(jwtTokenString, req, res, next) {
    let decoded;
    try {
        decoded = jwtDecode(jwtTokenString);
    }
    catch (err) {
        return errors.notAuthorised(res);
    }
    try {
        const sessionUserIsAuthenticated = await sessionusers.checkSessionToken(req.params.studentid, decoded.token);
        if (sessionUserIsAuthenticated) {
            const reqWithUser = req;
            reqWithUser.user = {
                sub: decoded.id,
                app_metadata: {
                    role: 'student',
                    tenant: sessionusers.CLASS_NAME,
                },
                session: decoded,
            };
            next();
        }
        else {
            errors.notAuthorised(res);
        }
    }
    catch (err) {
        next(err);
    }
}
function authenticate(req, res, next) {
    // the request is trying to access a resource in the session-users class
    if ((req.params.classid === sessionusers.CLASS_NAME) &&
        // the request includes an auth header
        req.headers.authorization &&
        typeof req.headers.authorization === 'string' &&
        // the auth header has a bearer token
        (req.headers.authorization.split(' ')[0] === 'Bearer')) {
        // Access to resources in the session-users class is managed locally
        const jwtToken = req.headers.authorization.split(' ')[1];
        sessionusersAuthenticate(jwtToken, req, res, next);
    }
    else {
        // Access to ALL other resources is managed using Auth0
        auth0Authenticate(req, res, next);
    }
}
exports.authenticate = authenticate;
function getValuesFromToken(req) {
    if (req.user && !req.user.app_metadata) {
        req.user.app_metadata = {
            role: req.user['https://machinelearningforkids.co.uk/api/role'],
            tenant: req.user['https://machinelearningforkids.co.uk/api/tenant'],
        };
    }
}
function checkValidUser(req, res, next) {
    const reqWithUser = req;
    getValuesFromToken(reqWithUser);
    if (!reqWithUser.user || !reqWithUser.user.app_metadata) {
        errors.notAuthorised(res);
        return;
    }
    if (reqWithUser.params.classid &&
        reqWithUser.user.app_metadata.tenant !== reqWithUser.params.classid) {
        errors.forbidden(res);
        return;
    }
    next();
}
exports.checkValidUser = checkValidUser;
function requireSupervisor(req, res, next) {
    const reqWithUser = req;
    if (reqWithUser.user.app_metadata.role !== 'supervisor') {
        errors.supervisorOnly(res);
        return;
    }
    next();
}
exports.requireSupervisor = requireSupervisor;
function requireSiteAdmin(req, res, next) {
    const reqWithUser = req;
    getValuesFromToken(reqWithUser);
    if (reqWithUser.user.app_metadata.role !== 'siteadmin') {
        return res.status(httpstatus.FORBIDDEN).json({ error: 'Forbidden' });
    }
    next();
}
exports.requireSiteAdmin = requireSiteAdmin;
async function ensureUnmanaged(req, res, next) {
    const tenant = req.params.classid;
    try {
        const policy = await store.getClassTenant(tenant);
        if (policy.isManaged) {
            res.status(httpstatus.FORBIDDEN)
                .json({ error: 'Access to API keys is forbidden for managed tenants' });
            return;
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
exports.ensureUnmanaged = ensureUnmanaged;
var ACCESS_TYPE;
(function (ACCESS_TYPE) {
    ACCESS_TYPE[ACCESS_TYPE["owneronly"] = 0] = "owneronly";
    //
    ACCESS_TYPE[ACCESS_TYPE["crowdsourced"] = 1] = "crowdsourced";
    //   as long as the resource has been flagged as "crowd-sourced"
    ACCESS_TYPE[ACCESS_TYPE["teacheraccess"] = 2] = "teacheraccess";
    //         their teacher
})(ACCESS_TYPE || (ACCESS_TYPE = {}));
/**
 * Express middleware to verify if the request should be authorised.
 *
 * @param isCrowdSourcedAllowed - if true, access is authorised for users in the same class as the project
 * @param isTeacherAccessAllowed - if true, access is authorised for teachers in the same class as the project
 */
async function verifyProjectAuth(req, res, next, allowedAccessTypes) {
    const classid = req.params.classid;
    const userid = req.params.studentid;
    const projectid = req.params.projectid;
    const reqWithUser = req;
    try {
        const project = await store.getProject(projectid);
        if (!project) {
            // attempt to access non-existent project
            return errors.notFound(res);
        }
        if (project.classid !== classid) {
            // attempt to access a project from another class/tenant
            return errors.forbidden(res);
        }
        const isOwner = reqWithUser.user &&
            (project.userid === reqWithUser.user.sub) &&
            (project.userid === userid);
        if (isOwner === false) {
            // The request has come from a user who is not the owner of
            //  the project that they are trying to access.
            //
            // That might be okay under some circumstances...
            if ( // owneronly : if they're not the owner, this access isn't allowed
            (allowedAccessTypes === ACCESS_TYPE.owneronly) ||
                // crowdsourced : if the project isn't crowd-sourced, this access isn't allowed
                (allowedAccessTypes === ACCESS_TYPE.crowdsourced && !project.isCrowdSourced) ||
                // teacheraccess : if the user isn't a teacher, this access isn't allowed
                (allowedAccessTypes === ACCESS_TYPE.teacheraccess &&
                    reqWithUser.user.app_metadata.role !== 'supervisor')) {
                return errors.forbidden(res);
            }
            // otherwise, carry on - it's okay
        }
        const modifiedRequest = req;
        modifiedRequest.project = project;
        next();
    }
    catch (err) {
        return next(err);
    }
}
/**
 * API Auth middleware.
 *
 * Ensures that the user is accessing a project that they
 *  have exclusive rights to.
 */
async function verifyProjectOwner(req, res, next) {
    verifyProjectAuth(req, res, next, ACCESS_TYPE.owneronly);
}
exports.verifyProjectOwner = verifyProjectOwner;
/**
 * API Auth middleware.
 *
 * Ensures that the user is accessing a project that they
 *  have at least read access to.
 */
async function verifyProjectAccess(req, res, next) {
    verifyProjectAuth(req, res, next, ACCESS_TYPE.crowdsourced);
}
exports.verifyProjectAccess = verifyProjectAccess;
/**
 * API Auth middleware.
 *
 * Ensures that the user is accessing a project that they
 *  have exclusive rights to, or they are the teacher of
 *  the owner of the project.
 */
async function verifyProjectOwnerOrTeacher(req, res, next) {
    verifyProjectAuth(req, res, next, ACCESS_TYPE.teacheraccess);
}
exports.verifyProjectOwnerOrTeacher = verifyProjectOwnerOrTeacher;
