"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const bodyParser = require("body-parser");
const helmet = require("helmet");
const query = require("connect-query");
// local dependencies
const bluemix_1 = require("./bluemix");
const users_1 = require("./users");
const projects_1 = require("./projects");
const training_1 = require("./training");
const images_1 = require("./images");
const sounds_1 = require("./sounds");
const models_1 = require("./models");
const scratch_1 = require("./scratch");
const appinventor_1 = require("./appinventor");
const watsonapis_1 = require("./watsonapis");
const classifiers_1 = require("./classifiers");
const sessionusers_1 = require("./sessionusers");
const sitealerts_1 = require("./sitealerts");
const URLS = require("./urls");
const serverConfig = require("./config");
const errors = require("./errors");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
/**
 * Sets up all of the REST API endpoints.
 */
function setup(app) {
    log.info('Setting up REST API');
    // force HTTPS when running on Bluemix
    serverConfig.setupForBluemix(app);
    // third-party middleware
    app.use(query());
    app.use(helmet());
    // UI setup
    serverConfig.setupUI(app);
    // body types
    app.use(URLS.SCRATCHKEY_CLASSIFY, bodyParser.json({ limit: '3mb' }));
    app.use(URLS.SOUNDS, bodyParser.json({ limit: '400kb' }));
    app.use(URLS.TRAININGITEMS, bodyParser.json({ limit: '400kb' }));
    app.use(URLS.ROOT, bodyParser.json({ limit: '100kb' }));
    // API route handlers
    bluemix_1.default(app);
    users_1.default(app);
    projects_1.default(app);
    training_1.default(app);
    images_1.default(app);
    sounds_1.default(app);
    models_1.default(app);
    scratch_1.default(app);
    appinventor_1.default(app);
    watsonapis_1.default(app);
    classifiers_1.default(app);
    sessionusers_1.default(app);
    sitealerts_1.default(app);
    // error handling
    errors.registerErrorHandling(app);
    errors.register404Handler(app);
}
exports.default = setup;
