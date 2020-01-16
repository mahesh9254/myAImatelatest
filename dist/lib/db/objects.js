"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const uuid = require("uuid/v1");
const uuidv4 = require("uuid/v4");
// local dependencies
const projects = require("./projects");
const sitealerts = require("./site-alerts");
const Objects = require("./db-types");
const TrainingObjects = require("../training/training-types");
// -----------------------------------------------------------------------------
//
// PROJECTS
//
// -----------------------------------------------------------------------------
function createProject(userid, classid, type, name, textlanguage, fields, crowdsource) {
    if (projects.typeLabels.indexOf(type) === -1) {
        throw new Error('Invalid project type ' + type);
    }
    if (userid === undefined || userid === '' ||
        name === undefined || name === '' ||
        classid === undefined || classid === '') {
        throw new Error('Missing required attributes');
    }
    const projectid = uuid();
    let fieldsObjs = [];
    if (type === 'numbers') {
        if (!fields || fields.length < MIN_FIELDS) {
            throw new Error('Fields required for numbers projects');
        }
        if (fields.length > MAX_FIELDS) {
            throw new Error('Too many fields specified');
        }
        if (containsDuplicateNames(fields)) {
            throw new Error('Fields all need different names');
        }
        fieldsObjs = fields.map((field) => createNumberProjectField(userid, classid, projectid, field));
    }
    else if (fields && fields.length > 0) {
        throw new Error('Fields not supported for non-numbers projects');
    }
    let language = '';
    if (type === 'text') {
        switch (textlanguage) {
            case 'en':
            case 'ar':
            case 'zh-tw':
            case 'zh-cn':
            case 'cs':
            case 'nl':
            case 'fr':
            case 'de':
            case 'it':
            case 'ja':
            case 'ko':
            case 'pt-br':
            case 'es':
                language = textlanguage;
                break;
            default:
                throw new Error('Language not supported');
        }
    }
    return {
        id: projectid,
        userid,
        classid,
        typeid: projects.typesByLabel[type].id,
        name,
        labels: '',
        language,
        fields: fieldsObjs,
        numfields: fieldsObjs.length,
        iscrowdsourced: crowdsource ? 1 : 0,
    };
}
exports.createProject = createProject;
function containsDuplicateNames(fields) {
    const names = {};
    return fields.some((field) => {
        if (names[field.name]) {
            return true;
        }
        names[field.name] = true;
        return false;
    });
}
function getProjectFromDbRow(row) {
    const type = projects.typesById[row.typeid].label;
    let language;
    if (type === 'text') {
        if (row.language) {
            language = row.language;
        }
        else {
            language = 'en';
        }
    }
    else {
        language = '';
    }
    return {
        id: row.id,
        userid: row.userid,
        classid: row.classid,
        type,
        name: row.name,
        labels: getLabelsFromList(row.labels),
        language,
        numfields: row.numfields ? row.numfields : 0,
        fields: row.fields ? row.fields.map(getNumbersProjectFieldSummaryFromDbRow) : [],
        isCrowdSourced: row.iscrowdsourced === 1,
    };
}
exports.getProjectFromDbRow = getProjectFromDbRow;
const MIN_FIELDS = 1;
const MAX_FIELDS = 10;
const MAX_FIELD_LENGTH = 12;
const MULTICHOICES_MIN_NUM_CHOICES = 2;
const MULTICHOICES_MAX_NUM_CHOICES = 5;
const MULTICHOICES_CHOICE_LABEL_MAXLENGTH = 9;
const IS_VALID_CHOICE = /^[^0-9\-.,][^,]*$/;
/**
 * Limit project names to 1-36 ASCII characters - everything
 * between a space (ASCII code 32) to a black square (ASCII code 254)
 */
exports.VALID_PROJECT_NAME = /^[ -■]{1,36}$/;
function createNumberProjectField(userid, classid, projectid, fieldinfo) {
    if (userid === undefined || userid === '' ||
        classid === undefined || classid === '' ||
        projectid === undefined || projectid === '' ||
        fieldinfo === undefined ||
        fieldinfo.type === undefined ||
        fieldinfo.name === undefined || fieldinfo.name === '') {
        throw new Error('Missing required attributes');
    }
    if (fieldinfo.name.length > MAX_FIELD_LENGTH) {
        throw new Error('Invalid field name');
    }
    if (projects.fieldTypeLabels.indexOf(fieldinfo.type) === -1) {
        throw new Error('Invalid field type ' + fieldinfo.type);
    }
    let choicesStr = '';
    if (fieldinfo.type === 'multichoice') {
        if (!fieldinfo.choices || fieldinfo.choices.length < MULTICHOICES_MIN_NUM_CHOICES) {
            throw new Error('Not enough choices provided');
        }
        if (fieldinfo.choices.length > MULTICHOICES_MAX_NUM_CHOICES) {
            throw new Error('Too many choices specified');
        }
        for (const choice of fieldinfo.choices) {
            if (!choice ||
                choice.trim().length === 0 ||
                choice.trim().length > MULTICHOICES_CHOICE_LABEL_MAXLENGTH ||
                IS_VALID_CHOICE.test(choice) === false) {
                throw new Error('Invalid choice value');
            }
        }
        choicesStr = fieldinfo.choices.map((choice) => choice.trim()).join(',');
    }
    return {
        id: uuid(),
        userid, classid, projectid,
        name: fieldinfo.name,
        fieldtype: projects.fieldTypesByLabel[fieldinfo.type].id,
        choices: choicesStr,
    };
}
exports.createNumberProjectField = createNumberProjectField;
function getNumbersProjectFieldFromDbRow(row) {
    return {
        id: row.id,
        userid: row.userid,
        classid: row.classid,
        projectid: row.projectid,
        name: row.name,
        type: projects.fieldTypesById[row.fieldtype].label,
        choices: row.choices ? getLabelsFromList(row.choices) : [],
    };
}
exports.getNumbersProjectFieldFromDbRow = getNumbersProjectFieldFromDbRow;
function getNumbersProjectFieldSummaryFromDbRow(row) {
    return {
        name: row.name,
        type: projects.fieldTypesById[row.fieldtype].label,
        choices: row.choices ? getLabelsFromList(row.choices) : [],
    };
}
exports.getNumbersProjectFieldSummaryFromDbRow = getNumbersProjectFieldSummaryFromDbRow;
function getLabelsFromList(liststr) {
    return liststr.split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}
exports.getLabelsFromList = getLabelsFromList;
function getLabelListFromArray(list) {
    const str = list.join(',');
    if (str.length >= 490) {
        throw new Error('No room for the label');
    }
    return str;
}
exports.getLabelListFromArray = getLabelListFromArray;
// -----------------------------------------------------------------------------
//
// TRAINING DATA
//
// -----------------------------------------------------------------------------
// these are the rules enforced by Conversation, but we might as well apply them globally
const INVALID_LABEL_NAME_CHARS = /[^\w.]/g;
const INVALID_TEXT_CHARS = /[\t\n]/g;
const MAX_CONTENTS_LENGTH = 1024;
function createLabel(proposedlabel) {
    return proposedlabel.replace(INVALID_LABEL_NAME_CHARS, '_').substr(0, Objects.MAX_LABEL_LENGTH);
}
exports.createLabel = createLabel;
function createTextTraining(projectid, data, label) {
    if (projectid === undefined || projectid === '' ||
        data === undefined || data === '') {
        throw new Error('Missing required attributes');
    }
    data = data.trim();
    if (data.length === 0) {
        throw new Error('Empty text is not allowed');
    }
    if (data.length > MAX_CONTENTS_LENGTH) {
        throw new Error('Text exceeds maximum allowed length (1024 characters)');
    }
    const object = {
        id: uuid(),
        projectid,
        textdata: data.replace(INVALID_TEXT_CHARS, ' '),
    };
    if (label) {
        object.label = label;
    }
    return object;
}
exports.createTextTraining = createTextTraining;
function getTextTrainingFromDbRow(row) {
    const obj = {
        id: row.id,
        textdata: row.textdata,
    };
    if (row.label) {
        obj.label = row.label;
    }
    if (row.projectid) {
        obj.projectid = row.projectid;
    }
    return obj;
}
exports.getTextTrainingFromDbRow = getTextTrainingFromDbRow;
function isEmptyString(obj) {
    return typeof obj === 'string' && obj.trim().length === 0;
}
function createNumberTraining(projectid, data, label) {
    if (projectid === undefined || projectid === '' ||
        data === undefined || data.length === 0) {
        throw new Error('Missing required attributes');
    }
    if (data.length > 10) {
        throw new Error('Number of data items exceeded maximum');
    }
    for (const num of data) {
        if (isNaN(num) || isEmptyString(num)) {
            throw new Error('Data contains non-numeric items');
        }
        if (num < -3.4028235e+38) {
            throw new Error('Number is too small');
        }
        if (num > 3.4028235e+38) {
            throw new Error('Number is too big');
        }
    }
    const object = {
        id: uuid(),
        projectid,
        numberdata: data,
    };
    if (label) {
        object.label = label;
    }
    return object;
}
exports.createNumberTraining = createNumberTraining;
function getNumberTrainingFromDbRow(row) {
    const obj = {
        id: row.id,
        numberdata: row.numberdata.split(',').map(parseFloat),
    };
    if (row.label) {
        obj.label = row.label;
    }
    if (row.projectid) {
        obj.projectid = row.projectid;
    }
    return obj;
}
exports.getNumberTrainingFromDbRow = getNumberTrainingFromDbRow;
function createImageTraining(projectid, imageurl, label, stored, imageid) {
    if (projectid === undefined || projectid === '' ||
        imageurl === undefined || imageurl === '') {
        throw new Error('Missing required attributes');
    }
    if (imageurl.length > MAX_CONTENTS_LENGTH) {
        throw new Error('Image URL exceeds maximum allowed length (' +
            MAX_CONTENTS_LENGTH +
            ' characters)');
    }
    const object = {
        id: imageid ? imageid : uuid(),
        projectid,
        imageurl,
    };
    if (label) {
        object.label = label;
    }
    object.isstored = stored ? 1 : 0;
    return object;
}
exports.createImageTraining = createImageTraining;
const IMAGEURL_USERID_REGEX = /\/api\/classes\/[0-9a-f-]{36}\/students\/(auth0\|[0-9a-f]*)\/projects\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}/;
// For references to images in the imagestore, it's not safe to assume
//  that the userid associated with a project is the user who stored
//  an image so we extract that from the URL
function getUserIdFromImageUrl(imageurl) {
    const check = IMAGEURL_USERID_REGEX.exec(imageurl);
    if (check) {
        return check[1];
    }
}
function getImageTrainingFromDbRow(row) {
    const obj = {
        id: row.id,
        imageurl: row.imageurl,
        isstored: row.isstored ? true : false,
    };
    if (obj.isstored) {
        obj.userid = getUserIdFromImageUrl(obj.imageurl);
    }
    if (row.label) {
        obj.label = row.label;
    }
    if (row.projectid) {
        obj.projectid = row.projectid;
    }
    return obj;
}
exports.getImageTrainingFromDbRow = getImageTrainingFromDbRow;
function isNotValidString(str) {
    return str === undefined ||
        str === '' ||
        typeof str !== 'string' ||
        str.trim().length === 0;
}
function createSoundTraining(projectid, audiourl, label, audiodataid) {
    if (isNotValidString(projectid) || isNotValidString(audiourl) ||
        isNotValidString(label) || isNotValidString(audiodataid)) {
        throw new Error('Missing required attributes');
    }
    return {
        id: audiodataid,
        projectid,
        audiourl,
        label,
    };
}
exports.createSoundTraining = createSoundTraining;
function getSoundTrainingFromDbRow(row) {
    const obj = {
        id: row.id,
        label: row.label,
        audiourl: row.audiourl,
    };
    if (row.projectid) {
        obj.projectid = row.projectid;
    }
    return obj;
}
exports.getSoundTrainingFromDbRow = getSoundTrainingFromDbRow;
function createSoundTrainingDbRow(obj) {
    return {
        id: obj.id,
        label: obj.label,
        audiourl: obj.audiourl,
        projectid: obj.projectid,
    };
}
exports.createSoundTrainingDbRow = createSoundTrainingDbRow;
// -----------------------------------------------------------------------------
//
// BLUEMIX CREDENTIALS
//
// -----------------------------------------------------------------------------
function getCredentialsFromDbRow(row) {
    return {
        id: row.id,
        servicetype: row.servicetype,
        url: row.url,
        username: row.username,
        password: row.password,
        classid: row.classid,
        credstype: row.credstypeid ? projects.credsTypesById[row.credstypeid].label : 'unknown',
    };
}
exports.getCredentialsFromDbRow = getCredentialsFromDbRow;
function getCredentialsAsDbRow(obj) {
    const creds = {
        id: obj.id,
        servicetype: obj.servicetype,
        url: obj.url,
        username: obj.username,
        password: obj.password,
        classid: obj.classid,
        credstypeid: obj.credstype ?
            projects.credsTypesByLabel[obj.credstype].id :
            projects.credsTypesByLabel.unknown.id,
    };
    if (obj.notes) {
        creds.notes = obj.notes;
    }
    return creds;
}
exports.getCredentialsAsDbRow = getCredentialsAsDbRow;
function validateVisrecApiKey(apikey) {
    if (apikey) {
        if (apikey.length === 44 || apikey.length === 40) {
            // yay - valid
            return apikey;
        }
        else {
            throw new Error('Invalid API key');
        }
    }
    else {
        throw new Error('Missing required attributes');
    }
}
function getCredentialsType(servicetype, credstype) {
    if (!credstype) {
        throw new Error('Missing required attributes');
    }
    if (credstype === 'unknown') {
        return 'unknown';
    }
    switch (servicetype) {
        case 'conv':
            if (credstype === 'conv_lite' || credstype === 'conv_standard') {
                return credstype;
            }
            throw new Error('Invalid credentials type');
        case 'visrec':
            if (credstype === 'visrec_lite' || credstype === 'visrec_standard') {
                return credstype;
            }
            throw new Error('Invalid credentials type');
        default:
            throw new Error('Invalid service type');
    }
}
function createBluemixCredentials(servicetype, classid, apikey, username, password, credstype) {
    if (servicetype === undefined) {
        throw new Error('Missing required attributes');
    }
    if (servicetype === 'visrec') {
        apikey = validateVisrecApiKey(apikey);
        return {
            id: uuid(),
            username: apikey.substr(0, 22),
            password: apikey.substr(22),
            classid,
            servicetype: 'visrec',
            url: apikey.length === 40 ?
                'https://gateway-a.watsonplatform.net/visual-recognition/api' :
                'https://gateway.watsonplatform.net/visual-recognition/api',
            credstype: getCredentialsType('visrec', credstype),
        };
    }
    else if (servicetype === 'conv') {
        if (username && password) {
            if (username.length === 36 && password.length === 12) {
                return {
                    id: uuid(),
                    username, password, classid,
                    servicetype: 'conv',
                    url: 'https://gateway.watsonplatform.net/conversation/api',
                    credstype: getCredentialsType('conv', credstype),
                };
            }
            else {
                throw new Error('Invalid credentials');
            }
        }
        else if (apikey) {
            if (apikey.length === 44) {
                return {
                    id: uuid(),
                    username: apikey.substr(0, 22),
                    password: apikey.substr(22),
                    classid,
                    servicetype: 'conv',
                    url: 'https://gateway-wdc.watsonplatform.net/assistant/api',
                    credstype: getCredentialsType('conv', credstype),
                };
            }
            else {
                throw new Error('Invalid API key');
            }
        }
        else {
            throw new Error('Missing required attributes');
        }
    }
    else {
        throw new Error('Invalid service type');
    }
}
exports.createBluemixCredentials = createBluemixCredentials;
// -----------------------------------------------------------------------------
//
// CLASSIFIERS
//
// -----------------------------------------------------------------------------
function createConversationWorkspace(classifierInfo, credentialsInfo, project) {
    return {
        id: classifierInfo.id,
        credentialsid: credentialsInfo.id,
        userid: project.userid,
        projectid: project.id,
        classid: project.classid,
        servicetype: 'conv',
        classifierid: classifierInfo.workspace_id,
        url: classifierInfo.url,
        name: classifierInfo.name,
        language: classifierInfo.language,
        created: classifierInfo.created,
        expiry: classifierInfo.expiry,
    };
}
exports.createConversationWorkspace = createConversationWorkspace;
function getWorkspaceFromDbRow(row) {
    let language;
    if (row.language) {
        language = row.language;
    }
    else {
        language = 'en';
    }
    return {
        id: row.id,
        workspace_id: row.classifierid,
        credentialsid: row.credentialsid,
        url: row.url,
        name: row.name,
        language,
        created: row.created,
        expiry: row.expiry,
    };
}
exports.getWorkspaceFromDbRow = getWorkspaceFromDbRow;
function createNumbersClassifier(userid, classid, projectid, status) {
    return {
        userid, projectid, classid,
        created: new Date(),
        status: status === 'Available' ? 1 : 0,
    };
}
exports.createNumbersClassifier = createNumbersClassifier;
function getNumbersClassifierFromDbRow(row) {
    return {
        created: row.created,
        status: row.status === 1 ? 'Available' : 'Failed',
        classifierid: row.projectid,
    };
}
exports.getNumbersClassifierFromDbRow = getNumbersClassifierFromDbRow;
function createVisualClassifier(classifierInfo, credentialsInfo, project) {
    return {
        id: classifierInfo.id,
        credentialsid: credentialsInfo.id,
        userid: project.userid,
        projectid: project.id,
        classid: project.classid,
        servicetype: 'visrec',
        classifierid: classifierInfo.classifierid,
        url: classifierInfo.url,
        name: classifierInfo.name,
        created: classifierInfo.created,
        expiry: classifierInfo.expiry,
        language: '',
    };
}
exports.createVisualClassifier = createVisualClassifier;
function getVisualClassifierFromDbRow(row) {
    return {
        id: row.id,
        classifierid: row.classifierid,
        credentialsid: row.credentialsid,
        url: row.url,
        name: row.name,
        created: row.created,
        expiry: row.expiry,
    };
}
exports.getVisualClassifierFromDbRow = getVisualClassifierFromDbRow;
// -----------------------------------------------------------------------------
//
// SCRATCH KEYS
//
// -----------------------------------------------------------------------------
function createScratchKey(credentials, name, type, projectid, classifierid, timestamp) {
    return {
        id: uuid() + uuidv4(),
        name, type, projectid,
        credentials, classifierid,
        updated: timestamp,
    };
}
exports.createScratchKey = createScratchKey;
function createUntrainedScratchKey(name, type, projectid) {
    return {
        id: uuid() + uuidv4(),
        name, type, projectid,
        updated: new Date(),
    };
}
exports.createUntrainedScratchKey = createUntrainedScratchKey;
function getScratchKeyFromDbRow(row) {
    let servicetype;
    switch (row.projecttype) {
        case 'text':
            servicetype = 'conv';
            break;
        case 'images':
            servicetype = 'visrec';
            break;
        case 'numbers':
            servicetype = 'num';
            break;
        case 'sounds':
            servicetype = 'sounds';
            break;
        default:
            throw new Error('Unrecognised service type');
    }
    if (row.classifierid) {
        return {
            id: row.id,
            projectid: row.projectid,
            name: row.projectname,
            type: row.projecttype,
            credentials: {
                id: '',
                servicetype,
                url: row.serviceurl,
                username: row.serviceusername,
                password: row.servicepassword,
                classid: row.classid,
                credstype: 'unknown',
            },
            classifierid: row.classifierid,
            updated: row.updated,
        };
    }
    else {
        return {
            id: row.id,
            projectid: row.projectid,
            name: row.projectname,
            type: row.projecttype,
            updated: row.updated,
        };
    }
}
exports.getScratchKeyFromDbRow = getScratchKeyFromDbRow;
// -----------------------------------------------------------------------------
//
// KNOWN SYSTEM ERRORS
//
// -----------------------------------------------------------------------------
function getKnownErrorFromDbRow(row) {
    return {
        id: row.id,
        type: row.type,
        servicetype: row.servicetype,
        objid: row.objid,
    };
}
exports.getKnownErrorFromDbRow = getKnownErrorFromDbRow;
function createKnownError(type, servicetype, objid) {
    if (servicetype !== 'conv' && servicetype !== 'visrec') {
        throw new Error('Unexpected service type');
    }
    if (type !== TrainingObjects.KnownErrorCondition.BadBluemixCredentials &&
        type !== TrainingObjects.KnownErrorCondition.UnmanagedBluemixClassifier) {
        throw new Error('Unexpected error type');
    }
    if (!objid || objid.trim().length === 0 || objid.length > 50) {
        throw new Error('Bad object id');
    }
    return {
        id: uuid(),
        type, servicetype, objid,
    };
}
exports.createKnownError = createKnownError;
// -----------------------------------------------------------------------------
//
// PENDING JOBS
//
// -----------------------------------------------------------------------------
function createDeleteObjectStoreJob(spec) {
    if (!spec.classid) {
        throw new Error('Missing required class id');
    }
    if (!spec.userid) {
        throw new Error('Missing required user id');
    }
    if (!spec.projectid) {
        throw new Error('Missing required project id');
    }
    if (!spec.objectid) {
        throw new Error('Missing required object id');
    }
    return {
        id: uuid(),
        jobtype: Objects.PendingJobType.DeleteOneObjectFromObjectStorage,
        jobdata: spec,
        attempts: 0,
    };
}
exports.createDeleteObjectStoreJob = createDeleteObjectStoreJob;
function createDeleteProjectObjectsJob(spec) {
    if (!spec.classid) {
        throw new Error('Missing required class id');
    }
    if (!spec.userid) {
        throw new Error('Missing required user id');
    }
    if (!spec.projectid) {
        throw new Error('Missing required project id');
    }
    return {
        id: uuid(),
        jobtype: Objects.PendingJobType.DeleteProjectObjectsFromObjectStorage,
        jobdata: spec,
        attempts: 0,
    };
}
exports.createDeleteProjectObjectsJob = createDeleteProjectObjectsJob;
function createDeleteUserObjectsJob(spec) {
    if (!spec.classid) {
        throw new Error('Missing required class id');
    }
    if (!spec.userid) {
        throw new Error('Missing required user id');
    }
    return {
        id: uuid(),
        jobtype: Objects.PendingJobType.DeleteUserObjectsFromObjectStorage,
        jobdata: spec,
        attempts: 0,
    };
}
exports.createDeleteUserObjectsJob = createDeleteUserObjectsJob;
function createDeleteClassObjectsJob(spec) {
    if (!spec.classid) {
        throw new Error('Missing required class id');
    }
    return {
        id: uuid(),
        jobtype: Objects.PendingJobType.DeleteClassObjectsFromObjectStorage,
        jobdata: spec,
        attempts: 0,
    };
}
exports.createDeleteClassObjectsJob = createDeleteClassObjectsJob;
function getPendingJobFromDbRow(row) {
    if (row.lastattempt) {
        return {
            id: row.id,
            jobtype: row.jobtype,
            jobdata: JSON.parse(row.jobdata),
            attempts: row.attempts,
            lastattempt: row.lastattempt,
        };
    }
    else {
        return {
            id: row.id,
            jobtype: row.jobtype,
            jobdata: JSON.parse(row.jobdata),
            attempts: row.attempts,
        };
    }
}
exports.getPendingJobFromDbRow = getPendingJobFromDbRow;
// -----------------------------------------------------------------------------
//
// TENANT INFO
//
// -----------------------------------------------------------------------------
const VALID_CLASSID = /^[a-z]{4,36}$/;
function createClassTenant(classid) {
    if (!classid) {
        throw new Error('Missing required class id');
    }
    if (VALID_CLASSID.test(classid) === false) {
        throw new Error('Not a valid class id');
    }
    return getClassDbRow(getDefaultClassTenant(classid));
}
exports.createClassTenant = createClassTenant;
function getClassFromDbRow(row) {
    return {
        id: row.id,
        supportedProjectTypes: row.projecttypes.split(','),
        isManaged: row.ismanaged === 1,
        maxUsers: row.maxusers,
        maxProjectsPerUser: row.maxprojectsperuser,
        textClassifierExpiry: row.textclassifiersexpiry,
        imageClassifierExpiry: row.imageclassifiersexpiry,
    };
}
exports.getClassFromDbRow = getClassFromDbRow;
function getClassDbRow(tenant) {
    return {
        id: tenant.id,
        projecttypes: tenant.supportedProjectTypes.join(','),
        maxusers: tenant.maxUsers,
        maxprojectsperuser: tenant.maxProjectsPerUser,
        textclassifiersexpiry: tenant.textClassifierExpiry,
        imageclassifiersexpiry: tenant.imageClassifierExpiry,
        ismanaged: tenant.isManaged ? 1 : 0,
    };
}
exports.getClassDbRow = getClassDbRow;
function getDefaultClassTenant(classid) {
    return {
        id: classid,
        supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
        isManaged: false,
        maxUsers: 30,
        maxProjectsPerUser: 3,
        textClassifierExpiry: 24,
        imageClassifierExpiry: 24,
    };
}
exports.getDefaultClassTenant = getDefaultClassTenant;
function setClassTenantExpiries(tenant, textexpiry, imageexpiry) {
    if (!tenant) {
        throw new Error('Missing tenant info to update');
    }
    if (!textexpiry || !imageexpiry) {
        throw new Error('Missing required expiry value');
    }
    if (!Number.isInteger(textexpiry) || !Number.isInteger(imageexpiry)) {
        throw new Error('Expiry values should be an integer number of hours');
    }
    if (textexpiry < 1 || imageexpiry < 1) {
        throw new Error('Expiry values should be a positive number of hours');
    }
    if (textexpiry > 255 || imageexpiry > 255) {
        throw new Error('Expiry values should not be greater than 255 hours');
    }
    tenant.textClassifierExpiry = textexpiry;
    tenant.imageClassifierExpiry = imageexpiry;
    return tenant;
}
exports.setClassTenantExpiries = setClassTenantExpiries;
// -----------------------------------------------------------------------------
//
// TEMPORARY SESSION USERS
//
// -----------------------------------------------------------------------------
function getSessionExpiryTime(lifespan) {
    const expiry = new Date(new Date().getTime() + lifespan);
    expiry.setMilliseconds(0);
    return expiry;
}
/**
 * @param lifespan - how long the user should exist for, in milliseconds
 */
function createTemporaryUser(lifespan) {
    return {
        id: uuidv4(),
        token: uuidv4(),
        sessionexpiry: getSessionExpiryTime(lifespan),
    };
}
exports.createTemporaryUser = createTemporaryUser;
function getTemporaryUserFromDbRow(row) {
    return {
        id: row.id,
        token: row.token,
        sessionExpiry: row.sessionexpiry,
    };
}
exports.getTemporaryUserFromDbRow = getTemporaryUserFromDbRow;
// -----------------------------------------------------------------------------
//
// SITE ALERT MESSAGES
//
// -----------------------------------------------------------------------------
const MAX_SITE_ALERT_STRING_LENGTH = 280;
function createSiteAlert(message, url, audience, severity, expiry) {
    if (sitealerts.audienceLabels.indexOf(audience) === -1) {
        throw new Error('Invalid audience type ' + audience);
    }
    if (sitealerts.severityLabels.indexOf(severity) === -1) {
        throw new Error('Invalid severity type ' + severity);
    }
    if (message === undefined || typeof message !== 'string' || message === '' ||
        typeof url !== 'string') {
        throw new Error('Missing required attributes');
    }
    if (!expiry || isNaN(expiry) || expiry <= 0) {
        throw new Error('Invalid expiry');
    }
    if (message.length > MAX_SITE_ALERT_STRING_LENGTH) {
        throw new Error('Invalid message');
    }
    if (url.length > MAX_SITE_ALERT_STRING_LENGTH) {
        throw new Error('Invalid URL');
    }
    const now = new Date();
    return {
        timestamp: now,
        audienceid: sitealerts.audiencesByLabel[audience].id,
        severityid: sitealerts.severitiesByLabel[severity].id,
        message, url,
        expiry: new Date(now.getTime() + expiry),
    };
}
exports.createSiteAlert = createSiteAlert;
function getSiteAlertFromDbRow(row) {
    const severity = sitealerts.severitiesById[row.severityid].label;
    const audience = sitealerts.audiencesById[row.audienceid].label;
    return {
        timestamp: row.timestamp,
        severity, audience,
        message: row.message,
        url: row.url,
        expiry: row.expiry,
    };
}
exports.getSiteAlertFromDbRow = getSiteAlertFromDbRow;
// -----------------------------------------------------------------------------
// GENERIC DATA TYPE FUNCTIONS
// -----------------------------------------------------------------------------
function getAsBoolean(row, field) {
    return row[field] === 1;
}
exports.getAsBoolean = getAsBoolean;
