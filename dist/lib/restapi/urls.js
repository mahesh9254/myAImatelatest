"use strict";
// tslint:disable:max-line-length
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT = '/';
exports.TEACHERS = '/api/teachers';
exports.CLASSES = '/api/classes';
//
// URLS about coding groups and classes
exports.CLASS = '/api/classes/:classid';
exports.BLUEMIX_CREDENTIALS = '/api/classes/:classid/credentials';
exports.BLUEMIX_CREDENTIAL = '/api/classes/:classid/credentials/:credentialsid';
exports.TENANT_POLICY = '/api/classes/:classid/policy';
exports.ALL_CLASS_PROJECTS = '/api/classes/:classid/projects';
exports.BLUEMIX_CLASSIFIERS = '/api/classes/:classid/classifiers';
exports.BLUEMIX_CLASSIFIER = '/api/classes/:classid/classifiers/:classifierid';
//
// URLS about the students in a class
exports.USERS = '/api/classes/:classid/students';
exports.USER = '/api/classes/:classid/students/:studentid';
exports.USER_PASSWORD = '/api/classes/:classid/students/:studentid/password';
exports.PASSWORD = '/api/classes/:classid/passwords';
//
// URLS about student projects
exports.PROJECTS = '/api/classes/:classid/students/:studentid/projects';
exports.PROJECT = '/api/classes/:classid/students/:studentid/projects/:projectid';
// Class definitions for a project
exports.FIELDS = '/api/classes/:classid/students/:studentid/projects/:projectid/fields';
exports.LABELS = '/api/classes/:classid/students/:studentid/projects/:projectid/labels';
// Training data for a project
exports.TRAININGITEMS = '/api/classes/:classid/students/:studentid/projects/:projectid/training';
exports.TRAININGITEM = '/api/classes/:classid/students/:studentid/projects/:projectid/training/:trainingid';
// ML models for a project
exports.MODELS = '/api/classes/:classid/students/:studentid/projects/:projectid/models';
exports.MODEL = '/api/classes/:classid/students/:studentid/projects/:projectid/models/:modelid';
exports.MODELTEST = '/api/classes/:classid/students/:studentid/projects/:projectid/models/:modelid/label';
// Scratch key for a project
exports.SCRATCHKEYS = '/api/classes/:classid/students/:studentid/projects/:projectid/scratchkeys';
//
// URLs about training data hosting
exports.IMAGES = '/api/classes/:classid/students/:studentid/projects/:projectid/images';
exports.IMAGE = '/api/classes/:classid/students/:studentid/projects/:projectid/images/:imageid';
exports.SOUNDS = '/api/classes/:classid/students/:studentid/projects/:projectid/sounds';
exports.SOUND = '/api/classes/:classid/students/:studentid/projects/:projectid/sounds/:soundid';
//
// URLs about Scratch Keys
exports.SCRATCHKEY_TRAIN = '/api/scratch/:scratchkey/train';
exports.SCRATCHKEY_CLASSIFY = '/api/scratch/:scratchkey/classify';
exports.SCRATCHKEY_STATUS = '/api/scratch/:scratchkey/status';
exports.SCRATCHKEY_MODEL = '/api/scratch/:scratchkey/models';
exports.SCRATCHKEY_EXTENSION = '/api/scratch/:scratchkey/extension.js';
exports.SCRATCH3_EXTENSION = '/api/scratch/:scratchkey/extension3.js';
//
// URLs about App Inventor
exports.APPINVENTOR_EXTENSION = '/api/appinventor/:scratchkey/extension';
//
// URLs about session users
exports.SESSION_USERS = '/api/sessionusers';
exports.SESSION_USER = '/api/classes/:classid/sessionusers/:studentid';
exports.SESSION_USER_APIS = '/api/classes/session-users/*';
//
// URLs about site alerts
exports.SITEALERTS = '/api/sitealerts';
exports.SITEALERTS_PUBLIC = '/api/sitealerts/public';
exports.SITEALERTS_STUDENT = '/api/sitealerts/alerts/:classid/students/:studentid';
exports.SITEALERTS_TEACHER = '/api/sitealerts/alerts/:classid/supervisors/:studentid';
exports.SITEALERTS_REFRESH = '/api/sitealerts/actions/refresh';
// tslint:enable:max-line-length
