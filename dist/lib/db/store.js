"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const mysqldb = require("./mysqldb");
const dbobjects = require("./objects");
const projectObjects = require("./projects");
const numbers = require("../training/numbers");
const conversation = require("../training/conversation");
const visualrec = require("../training/visualrecognition");
const limits = require("./limits");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
let dbConnPool;
async function init() {
    if (!dbConnPool) {
        dbConnPool = await mysqldb.connect();
    }
}
exports.init = init;
async function disconnect() {
    if (dbConnPool) {
        await mysqldb.disconnect();
        // @ts-ignore
        dbConnPool = undefined;
    }
}
exports.disconnect = disconnect;
function replaceDbConnPoolForTest(testDbConnPool) {
    dbConnPool = testDbConnPool;
}
exports.replaceDbConnPoolForTest = replaceDbConnPoolForTest;
async function restartConnection() {
    log.info('Restarting DB connection pool');
    try {
        await disconnect();
        await init();
    }
    catch (err) {
        log.error({ err }, 'Probably-irrecoverable-failure while trying to restart the DB connection');
    }
}
async function handleDbException(err) {
    if (err.code === 'ER_OPTION_PREVENTS_STATEMENT' && err.errno === 1290) {
        // for this error, it is worth trying to reconnect to the DB
        await restartConnection();
    }
}
async function dbExecute(query, params) {
    const dbConn = await dbConnPool.getConnection();
    try {
        const [response] = await dbConn.execute(query, params);
        return response;
    }
    catch (err) {
        log.error({ query, params: params.join(','), err }, 'DB error');
        await handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
}
// -----------------------------------------------------------------------------
//
// PROJECTS
//
// -----------------------------------------------------------------------------
async function storeProject(userid, classid, type, name, language, fields, crowdsource) {
    let obj;
    try {
        obj = dbobjects.createProject(userid, classid, type, name, language, fields, crowdsource);
    }
    catch (err) {
        err.statusCode = 400;
        throw err;
    }
    const insertProjectQry = 'INSERT INTO `projects` ' +
        '(`id`, `userid`, `classid`, `typeid`, `name`, `language`, `labels`, `numfields`, `iscrowdsourced`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const insertProjectValues = [
        obj.id,
        obj.userid, obj.classid,
        obj.typeid,
        obj.name, obj.language, obj.labels,
        obj.fields.length,
        obj.iscrowdsourced,
    ];
    const insertFieldsQry = 'INSERT INTO `numbersprojectsfields` ' +
        '(`id`, `userid`, `classid`, `projectid`, `name`, `fieldtype`, `choices`) ' +
        'VALUES ?';
    const insertFieldsValues = obj.fields.map((field) => {
        return [
            field.id, field.userid, field.classid, field.projectid, field.name, field.fieldtype, field.choices,
        ];
    });
    let outcome = InsertTrainingOutcome.StoredOk;
    const dbConn = await dbConnPool.getConnection();
    try {
        // store the project info
        const [insertResponse] = await dbConn.execute(insertProjectQry, insertProjectValues);
        if (insertResponse.affectedRows !== 1) {
            log.error({ insertResponse }, 'Failed to store project info');
            outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
        }
        // store the fields for the project if we have any
        if (outcome === InsertTrainingOutcome.StoredOk && insertFieldsValues.length > 0) {
            const [insertFieldsResponse] = await dbConn.query(insertFieldsQry, [insertFieldsValues]);
            if (insertFieldsResponse.affectedRows !== insertFieldsValues.length) {
                log.error({ insertFieldsResponse }, 'Failed to store project fields');
                outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
            }
        }
    }
    catch (err) {
        if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            err.statusCode = 400;
            err.message = 'Sorry, some of those letters can\'t be used in project names';
            throw err;
        }
        handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
    if (outcome === InsertTrainingOutcome.StoredOk) {
        return dbobjects.getProjectFromDbRow(obj);
    }
    throw new Error('Failed to store project');
}
exports.storeProject = storeProject;
async function getNumberProjectFields(userid, classid, projectid) {
    const queryString = 'SELECT `id`, `userid`, `classid`, `projectid`, `name`, `fieldtype`, `choices` ' +
        'FROM `numbersprojectsfields` ' +
        'WHERE `userid` = ? AND `classid` = ? AND `projectid` = ? ' +
        'ORDER BY `id`';
    const rows = await dbExecute(queryString, [userid, classid, projectid]);
    return rows.map(dbobjects.getNumbersProjectFieldFromDbRow);
}
exports.getNumberProjectFields = getNumberProjectFields;
async function getCurrentLabels(userid, classid, projectid) {
    const queryString = 'SELECT `id`, `labels` ' +
        'FROM `projects` ' +
        'WHERE `id` = ? AND `userid` = ? AND `classid` = ?';
    const values = [
        projectid,
        userid,
        classid,
    ];
    const rows = await dbExecute(queryString, values);
    if (rows.length === 1) {
        return dbobjects.getLabelsFromList(rows[0].labels);
    }
    else if (rows.length === 0) {
        log.warn({ projectid, classid, func: 'getCurrentLabels' }, 'Project not found in request for labels');
    }
    else {
        log.error({ projectid, classid, rows, func: 'getCurrentLabels' }, 'Unexpected number of project rows');
    }
    throw new Error('Project not found');
}
async function updateLabels(userid, classid, projectid, labels) {
    const queryString = 'UPDATE `projects` ' +
        'SET `labels` = ? ' +
        'WHERE `id` = ? AND `userid` = ? AND `classid` = ?';
    const values = [
        dbobjects.getLabelListFromArray(labels),
        projectid,
        userid,
        classid,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ projectid }, 'Failed to update project');
        throw new Error('Project not updated');
    }
}
async function addLabelToProject(userid, classid, projectid, label) {
    const labels = await getCurrentLabels(userid, classid, projectid);
    const newlabel = dbobjects.createLabel(label);
    if (labels.includes(newlabel) === false) {
        labels.push(newlabel);
    }
    await updateLabels(userid, classid, projectid, labels);
    return labels;
}
exports.addLabelToProject = addLabelToProject;
async function removeLabelFromProject(userid, classid, projectid, labelToRemove) {
    const project = await getProject(projectid);
    if (!project) {
        throw new Error('Project not found');
    }
    const labels = project.labels;
    const index = labels.indexOf(labelToRemove);
    if (index !== -1) {
        labels.splice(index, 1);
    }
    await updateLabels(userid, classid, projectid, labels);
    await deleteTrainingLabel(project.type, projectid, labelToRemove);
    return labels;
}
exports.removeLabelFromProject = removeLabelFromProject;
async function replaceLabelsForProject(userid, classid, projectid, labels) {
    await updateLabels(userid, classid, projectid, labels);
    return labels;
}
exports.replaceLabelsForProject = replaceLabelsForProject;
async function getProject(id) {
    const queryString = 'SELECT `id`, `userid`, `classid`, ' +
        '`typeid`, `name`, `language`, ' +
        '`labels`, `numfields`, ' +
        '`iscrowdsourced` ' +
        'FROM `projects` ' +
        'WHERE `id` = ?';
    const rows = await dbExecute(queryString, [id]);
    if (rows.length === 1) {
        return dbobjects.getProjectFromDbRow(rows[0]);
    }
    else if (rows.length === 0) {
        log.warn({ id, func: 'getProject' }, 'Project not found');
    }
    else {
        log.error({ rows, id, func: 'getProject' }, 'Project not found');
    }
    return;
}
exports.getProject = getProject;
/**
 * Fetches projects that the specified user is entitled to access.
 *
 * This list should include:
 *  Any projects created by the specified user
 *  Any crowd-sourced projects owned by the user the class is in.
 */
async function getProjectsByUserId(userid, classid) {
    const queryString = 'SELECT `id`, `userid`, `classid`, ' +
        '`typeid`, `name`, `language`, ' +
        '`labels`, ' +
        '`iscrowdsourced` ' +
        'FROM `projects` ' +
        'WHERE `classid` = ? AND (`userid` = ? OR `iscrowdsourced` = True)';
    const rows = await dbExecute(queryString, [classid, userid]);
    return rows.map(dbobjects.getProjectFromDbRow);
}
exports.getProjectsByUserId = getProjectsByUserId;
async function countProjectsByUserId(userid, classid) {
    const queryString = 'SELECT COUNT(*) AS count ' +
        'FROM `projects` ' +
        'WHERE `userid` = ? AND `classid` = ?';
    const rows = await dbExecute(queryString, [userid, classid]);
    if (rows.length !== 1) {
        return 0;
    }
    return rows[0].count;
}
exports.countProjectsByUserId = countProjectsByUserId;
async function getProjectsByClassId(classid) {
    const queryString = 'SELECT `id`, `userid`, `classid`, `typeid`, `name`, `labels`, `language`, `iscrowdsourced` ' +
        'FROM `projects` ' +
        'WHERE `classid` = ?';
    const rows = await dbExecute(queryString, [classid]);
    return rows.map(dbobjects.getProjectFromDbRow);
}
exports.getProjectsByClassId = getProjectsByClassId;
async function deleteProjectsByClassId(classid) {
    const queryString = 'DELETE FROM `projects` WHERE `classid` = ?';
    const response = await dbExecute(queryString, [classid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete projects');
    }
}
exports.deleteProjectsByClassId = deleteProjectsByClassId;
// -----------------------------------------------------------------------------
//
// TRAINING DATA
//
// -----------------------------------------------------------------------------
function getDbTable(type) {
    switch (type) {
        case 'text':
            return 'texttraining';
        case 'numbers':
            return 'numbertraining';
        case 'images':
            return 'imagetraining';
        case 'sounds':
            return 'soundtraining';
    }
}
async function countTraining(type, projectid) {
    const dbTable = getDbTable(type);
    const queryString = 'SELECT COUNT(*) AS `trainingcount` FROM `' + dbTable + '` WHERE `projectid` = ?';
    const response = await dbExecute(queryString, [projectid]);
    return response[0].trainingcount;
}
exports.countTraining = countTraining;
async function countTrainingByLabel(project) {
    const dbTable = getDbTable(project.type);
    const queryString = 'SELECT `label`, COUNT(*) AS `trainingcount` FROM `' + dbTable + '` ' +
        'WHERE `projectid` = ? ' +
        'GROUP BY `label`';
    const response = await dbExecute(queryString, [project.id]);
    const counts = {};
    for (const count of response) {
        counts[count.label] = count.trainingcount;
    }
    return counts;
}
exports.countTrainingByLabel = countTrainingByLabel;
async function renameTrainingLabel(type, projectid, labelBefore, labelAfter) {
    const dbTable = getDbTable(type);
    const queryString = 'UPDATE `' + dbTable + '` ' +
        'SET `label` = ? ' +
        'WHERE `projectid` = ? AND `label` = ?';
    const dbConn = await dbConnPool.getConnection();
    await dbConn.query(queryString, [labelAfter, projectid, labelBefore]);
    dbConn.release();
}
exports.renameTrainingLabel = renameTrainingLabel;
async function deleteTraining(type, projectid, trainingid) {
    const dbTable = getDbTable(type);
    const queryString = 'DELETE FROM `' + dbTable + '` WHERE `id` = ? AND `projectid` = ?';
    const response = await dbExecute(queryString, [trainingid, projectid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete training');
    }
}
exports.deleteTraining = deleteTraining;
async function deleteTrainingLabel(type, projectid, label) {
    const dbTable = getDbTable(type);
    const queryString = 'DELETE FROM `' + dbTable + '` WHERE `projectid` = ? AND `label` = ?';
    const response = await dbExecute(queryString, [projectid, label]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete label');
    }
}
async function deleteTrainingByProjectId(type, projectid) {
    const dbTable = getDbTable(type);
    const queryString = 'DELETE FROM `' + dbTable + '` WHERE `projectid` = ?';
    const response = await dbExecute(queryString, [projectid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete training');
    }
}
exports.deleteTrainingByProjectId = deleteTrainingByProjectId;
async function storeTextTraining(projectid, data, label) {
    let outcome;
    // prepare the data that we want to store
    const obj = dbobjects.createTextTraining(projectid, data, label);
    //
    // prepare the queries so we have everything ready before we
    //  get a DB connection from the pool
    //
    const countQry = 'SELECT COUNT(*) AS `trainingcount` FROM `texttraining` WHERE `projectid` = ?';
    const countValues = [projectid];
    const insertQry = 'INSERT INTO `texttraining` (`id`, `projectid`, `textdata`, `label`) VALUES (?, ?, ?, ?)';
    const insertValues = [obj.id, obj.projectid, obj.textdata, obj.label];
    //
    // connect to the DB
    //
    const dbConn = await dbConnPool.getConnection();
    try {
        // count how much training data they already have
        const [countResponse] = await dbConn.execute(countQry, countValues);
        const count = countResponse[0].trainingcount;
        if (count >= limits.getStoreLimits().textTrainingItemsPerProject) {
            // they already have too much data - nothing else to do
            outcome = InsertTrainingOutcome.NotStored_MetLimit;
        }
        else {
            // they haven't hit their limit - okay to do the INSERT now
            const [insertResponse] = await dbConn.execute(insertQry, insertValues);
            if (insertResponse.affectedRows === 1) {
                outcome = InsertTrainingOutcome.StoredOk;
            }
            else {
                // insert failed for no clear reason
                log.error({ projectid, data, label, insertQry, insertValues, insertResponse }, 'INSERT text failure');
                outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
            }
        }
    }
    catch (err) {
        handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
    //
    // prepare the response for the client
    //
    switch (outcome) {
        case InsertTrainingOutcome.StoredOk:
            return dbobjects.getTextTrainingFromDbRow(obj);
        case InsertTrainingOutcome.NotStored_MetLimit:
            throw new Error('Project already has maximum allowed amount of training data');
        case InsertTrainingOutcome.NotStored_UnknownFailure:
            throw new Error('Failed to store training data');
    }
}
exports.storeTextTraining = storeTextTraining;
async function bulkStoreTextTraining(projectid, training) {
    const objects = training.map((item) => {
        const obj = dbobjects.createTextTraining(projectid, item.textdata, item.label);
        return [obj.id, obj.projectid, obj.textdata, obj.label];
    });
    const queryString = 'INSERT INTO `texttraining` (`id`, `projectid`, `textdata`, `label`) VALUES ?';
    const dbConn = await dbConnPool.getConnection();
    const [response] = await dbConn.query(queryString, [objects]);
    await dbConn.release();
    if (response.affectedRows === training.length) {
        return;
    }
    throw new Error('Failed to store training data');
}
exports.bulkStoreTextTraining = bulkStoreTextTraining;
async function getTextTraining(projectid, options) {
    const queryString = 'SELECT `id`, `textdata`, `label` FROM `texttraining` ' +
        'WHERE `projectid` = ? ' +
        'ORDER BY `label`, `id` ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, options.limit, options.start]);
    return rows.map(dbobjects.getTextTrainingFromDbRow);
}
exports.getTextTraining = getTextTraining;
async function getTextTrainingByLabel(projectid, label, options) {
    const queryString = 'SELECT `id`, `textdata`, `label` FROM `texttraining` ' +
        'WHERE `projectid` = ? AND `label` = ? ' +
        'ORDER BY `textdata` ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, label, options.limit, options.start]);
    return rows.map(dbobjects.getTextTrainingFromDbRow);
}
exports.getTextTrainingByLabel = getTextTrainingByLabel;
async function getUniqueTrainingTextsByLabel(projectid, label, options) {
    // Conversation chokes on duplicate texts, so we're using SELECT DISTINCT to avoid that
    const queryString = 'SELECT DISTINCT `textdata` FROM `texttraining` ' +
        'WHERE `projectid` = ? AND `label` = ? ' +
        'LIMIT ? OFFSET ?';
    const queryParams = [projectid, label, options.limit, options.start];
    const rows = await dbExecute(queryString, queryParams);
    return rows.map((row) => row.textdata);
}
exports.getUniqueTrainingTextsByLabel = getUniqueTrainingTextsByLabel;
async function storeImageTraining(projectid, imageurl, label, stored, imageid) {
    let outcome;
    // prepare the data that we want to store
    const obj = dbobjects.createImageTraining(projectid, imageurl, label, stored, imageid);
    //
    // prepare the queries so we have everything ready before we
    //  get a DB connection from the pool
    //
    const countQry = 'SELECT COUNT(*) AS `trainingcount` FROM `imagetraining` WHERE `projectid` = ?';
    const countValues = [projectid];
    const insertQry = 'INSERT INTO `imagetraining` ' +
        '(`id`, `projectid`, `imageurl`, `label`, `isstored`) ' +
        'VALUES (?, ?, ?, ?, ?)';
    const insertValues = [obj.id, obj.projectid, obj.imageurl, obj.label, obj.isstored];
    //
    // connect to the DB
    //
    const dbConn = await dbConnPool.getConnection();
    try {
        // count how much training data they already have
        const [countResponse] = await dbConn.execute(countQry, countValues);
        const count = countResponse[0].trainingcount;
        if (count >= limits.getStoreLimits().imageTrainingItemsPerProject) {
            // they already have too much data - nothing else to do
            outcome = InsertTrainingOutcome.NotStored_MetLimit;
        }
        else {
            // they haven't hit their limit - okay to do the INSERT now
            const [insertResponse] = await dbConn.execute(insertQry, insertValues);
            if (insertResponse.affectedRows === 1) {
                outcome = InsertTrainingOutcome.StoredOk;
            }
            else {
                // insert failed for no clear reason
                outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
            }
        }
    }
    catch (err) {
        handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
    //
    // prepare the response for the client
    //
    switch (outcome) {
        case InsertTrainingOutcome.StoredOk:
            return dbobjects.getImageTrainingFromDbRow(obj);
        case InsertTrainingOutcome.NotStored_MetLimit:
            throw new Error('Project already has maximum allowed amount of training data');
        case InsertTrainingOutcome.NotStored_UnknownFailure:
            throw new Error('Failed to store training data');
    }
}
exports.storeImageTraining = storeImageTraining;
async function bulkStoreImageTraining(projectid, training) {
    const objects = training.map((item) => {
        const obj = dbobjects.createImageTraining(projectid, item.imageurl, item.label, false);
        return [obj.id, obj.projectid, obj.imageurl, obj.label, obj.isstored];
    });
    const queryString = 'INSERT INTO `imagetraining` (`id`, `projectid`, `imageurl`, `label`, `isstored`) VALUES ?';
    const dbConn = await dbConnPool.getConnection();
    const [response] = await dbConn.query(queryString, [objects]);
    await dbConn.release();
    if (response.affectedRows === training.length) {
        return;
    }
    throw new Error('Failed to store training data');
}
exports.bulkStoreImageTraining = bulkStoreImageTraining;
async function getImageTraining(projectid, options) {
    const queryString = 'SELECT `id`, `imageurl`, `label`, `isstored` FROM `imagetraining` ' +
        'WHERE `projectid` = ? ' +
        'ORDER BY `label`, `imageurl` ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, options.limit, options.start]);
    return rows.map(dbobjects.getImageTrainingFromDbRow);
}
exports.getImageTraining = getImageTraining;
async function getImageTrainingByLabel(projectid, label, options) {
    const queryString = 'SELECT `id`, `imageurl`, `label`, `isstored` FROM `imagetraining` ' +
        'WHERE `projectid` = ? AND `label` = ? ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, label, options.limit, options.start]);
    return rows.map(dbobjects.getImageTrainingFromDbRow);
}
exports.getImageTrainingByLabel = getImageTrainingByLabel;
async function getStoredImageTraining(projectid, label) {
    const queryString = 'SELECT `id`, `imageurl`, `label`, `isstored` FROM `imagetraining` ' +
        'WHERE `projectid` = ? AND `label` = ? AND `isstored` = 1 ' +
        'LIMIT 1000';
    const rows = await dbExecute(queryString, [projectid, label]);
    return rows.map(dbobjects.getImageTrainingFromDbRow);
}
exports.getStoredImageTraining = getStoredImageTraining;
async function isImageStored(imageid) {
    const queryString = 'SELECT `isstored` FROM `imagetraining` WHERE `id` = ?';
    const values = [imageid];
    const rows = await dbExecute(queryString, values);
    if (rows.length > 0) {
        return rows[0].isstored === 1;
    }
    return false;
}
exports.isImageStored = isImageStored;
var InsertTrainingOutcome;
(function (InsertTrainingOutcome) {
    InsertTrainingOutcome[InsertTrainingOutcome["StoredOk"] = 0] = "StoredOk";
    InsertTrainingOutcome[InsertTrainingOutcome["NotStored_MetLimit"] = 1] = "NotStored_MetLimit";
    InsertTrainingOutcome[InsertTrainingOutcome["NotStored_UnknownFailure"] = 2] = "NotStored_UnknownFailure";
})(InsertTrainingOutcome || (InsertTrainingOutcome = {}));
async function storeNumberTraining(projectid, isClassProject, data, label) {
    let outcome;
    // prepare the data that we want to store
    const obj = dbobjects.createNumberTraining(projectid, data, label);
    //
    // prepare the queries so we have everything ready before we
    //  get a DB connection from the pool
    //
    const countQry = 'SELECT COUNT(*) AS `trainingcount` FROM `numbertraining` WHERE `projectid` = ?';
    const countValues = [projectid];
    const insertQry = 'INSERT INTO `numbertraining` ' +
        '(`id`, `projectid`, `numberdata`, `label`) VALUES (?, ?, ?, ?)';
    const insertValues = [obj.id, obj.projectid, data.join(','), obj.label];
    //
    // connect to the DB
    //
    const dbConn = await dbConnPool.getConnection();
    try {
        // count how much training data they already have
        const [countResponse] = await dbConn.execute(countQry, countValues);
        const count = countResponse[0].trainingcount;
        // how much training data are they allowed to have
        const classLimits = limits.getStoreLimits();
        const limit = isClassProject ? classLimits.numberTrainingItemsPerClassProject :
            classLimits.numberTrainingItemsPerProject;
        if (count >= limit) {
            // they already have too much data - nothing else to do
            outcome = InsertTrainingOutcome.NotStored_MetLimit;
        }
        else {
            // they haven't hit their limit - okay to do the INSERT now
            const [insertResponse] = await dbConn.execute(insertQry, insertValues);
            if (insertResponse.affectedRows === 1) {
                outcome = InsertTrainingOutcome.StoredOk;
            }
            else {
                // insert failed for no clear reason
                outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
            }
        }
    }
    catch (err) {
        handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
    //
    // prepare the response for the client
    //
    switch (outcome) {
        case InsertTrainingOutcome.StoredOk:
            return obj;
        case InsertTrainingOutcome.NotStored_MetLimit:
            throw new Error('Project already has maximum allowed amount of training data');
        case InsertTrainingOutcome.NotStored_UnknownFailure:
            throw new Error('Failed to store training data');
    }
}
exports.storeNumberTraining = storeNumberTraining;
async function bulkStoreNumberTraining(projectid, training) {
    const objects = training.map((item) => {
        const obj = dbobjects.createNumberTraining(projectid, item.numberdata, item.label);
        return [obj.id, obj.projectid, obj.numberdata.join(','), obj.label];
    });
    const queryString = 'INSERT INTO `numbertraining` (`id`, `projectid`, `numberdata`, `label`) VALUES ?';
    const dbConn = await dbConnPool.getConnection();
    const [response] = await dbConn.query(queryString, [objects]);
    dbConn.release();
    if (response.affectedRows === training.length) {
        return;
    }
    throw new Error('Failed to store training data');
}
exports.bulkStoreNumberTraining = bulkStoreNumberTraining;
async function getNumberTraining(projectid, options) {
    const queryString = 'SELECT `id`, `numberdata`, `label` FROM `numbertraining` ' +
        'WHERE `projectid` = ? ' +
        'ORDER BY `label` ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, options.limit, options.start]);
    return rows.map(dbobjects.getNumberTrainingFromDbRow);
}
exports.getNumberTraining = getNumberTraining;
async function storeSoundTraining(projectid, audiourl, label, audioid) {
    let outcome;
    // prepare the data to be stored
    const obj = dbobjects.createSoundTraining(projectid, audiourl, label, audioid);
    // prepare the DB queries
    const countQry = 'SELECT COUNT(*) AS `trainingcount` from `soundtraining` WHERE `projectid` = ?';
    const countValues = [projectid];
    const insertQry = 'INSERT INTO `soundtraining` (`id`, `projectid`, `audiourl`, `label`) VALUES (?, ?, ?, ?)';
    const insertValues = [obj.id, obj.projectid, obj.audiourl, obj.label];
    // connect to the DB
    const dbConn = await dbConnPool.getConnection();
    // store the data unless the project is already full
    try {
        // count the number of training items already in the project
        const [countResponse] = await dbConn.execute(countQry, countValues);
        const count = countResponse[0].trainingcount;
        if (count >= limits.getStoreLimits().soundTrainingItemsPerProject) {
            // they already have too much data - nothing else to do
            outcome = InsertTrainingOutcome.NotStored_MetLimit;
        }
        else {
            // they haven't reached their limit yet - okay to INSERT
            const [insertResponse] = await dbConn.execute(insertQry, insertValues);
            if (insertResponse.affectedRows === 1) {
                outcome = InsertTrainingOutcome.StoredOk;
            }
            else {
                // insert failed for an unknown reason
                outcome = InsertTrainingOutcome.NotStored_UnknownFailure;
            }
        }
    }
    catch (err) {
        handleDbException(err);
        throw err;
    }
    finally {
        dbConn.release();
    }
    // prepare the response
    switch (outcome) {
        case InsertTrainingOutcome.StoredOk:
            return obj;
        case InsertTrainingOutcome.NotStored_MetLimit:
            throw new Error('Project already has maximum allowed amount of training data');
        case InsertTrainingOutcome.NotStored_UnknownFailure:
            throw new Error('Failed to store training data');
    }
}
exports.storeSoundTraining = storeSoundTraining;
async function getSoundTraining(projectid, options) {
    const queryString = 'SELECT `id`, `audiourl`, `label` FROM `soundtraining` ' +
        'WHERE `projectid` = ? ' +
        'ORDER BY `label`, `id` ' +
        'LIMIT ? OFFSET ?';
    const rows = await dbExecute(queryString, [projectid, options.limit, options.start]);
    return rows.map(dbobjects.getSoundTrainingFromDbRow);
}
exports.getSoundTraining = getSoundTraining;
// -----------------------------------------------------------------------------
//
// BLUEMIX CREDENTIALS
//
// -----------------------------------------------------------------------------
async function storeBluemixCredentials(classid, credentials) {
    const queryString = 'INSERT INTO `bluemixcredentials` ' +
        '(`id`, `classid`, `servicetype`, `url`, `username`, `password`, `credstypeid`, `notes`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [credentials.id, classid,
        credentials.servicetype, credentials.url, credentials.username, credentials.password,
        credentials.credstypeid,
        credentials.notes ? credentials.notes : null];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows === 1) {
        return dbobjects.getCredentialsFromDbRow(credentials);
    }
    throw new Error('Failed to store credentials');
}
exports.storeBluemixCredentials = storeBluemixCredentials;
async function setBluemixCredentialsType(classid, credentialsid, servicetype, credstype) {
    const credstypeObj = projectObjects.credsTypesByLabel[credstype];
    if (!credstypeObj) {
        throw new Error('Unrecognised credentials type');
    }
    const queryString = 'UPDATE `bluemixcredentials` ' +
        'SET `credstypeid` = ? ' +
        'WHERE `id` = ? AND `servicetype` = ? AND `classid` = ?';
    const queryParameters = [credstypeObj.id, credentialsid, servicetype, classid];
    const response = await dbExecute(queryString, queryParameters);
    if (response.affectedRows !== 1) {
        log.error({ queryString, queryParameters, response }, 'Failed to update credentials');
        throw new Error('Bluemix credentials not updated');
    }
}
exports.setBluemixCredentialsType = setBluemixCredentialsType;
async function getAllBluemixCredentials(service) {
    const queryString = 'SELECT `id`, `classid`, `servicetype`, `url`, `username`, `password`, `credstypeid` ' +
        'FROM `bluemixcredentials` ' +
        'WHERE `servicetype` = ? ' +
        'LIMIT 2000';
    const rows = await dbExecute(queryString, [service]);
    return rows.map(dbobjects.getCredentialsFromDbRow);
}
exports.getAllBluemixCredentials = getAllBluemixCredentials;
async function getBluemixCredentials(classid, service) {
    const queryString = 'SELECT `id`, `classid`, `servicetype`, `url`, `username`, `password`, `credstypeid` ' +
        'FROM `bluemixcredentials` ' +
        'WHERE `classid` = ? AND `servicetype` = ?';
    const rows = await dbExecute(queryString, [classid, service]);
    if (rows.length === 0) {
        log.warn({ rows, func: 'getBluemixCredentials' }, 'Unexpected response from DB');
        throw new Error('Unexpected response when retrieving service credentials');
    }
    return rows.map(dbobjects.getCredentialsFromDbRow);
}
exports.getBluemixCredentials = getBluemixCredentials;
async function getBluemixCredentialsById(credentialsid) {
    const credsQuery = 'SELECT `id`, `classid`, `servicetype`, `url`, `username`, `password`, `credstypeid` ' +
        'FROM `bluemixcredentials` ' +
        'WHERE `id` = ?';
    const rows = await dbExecute(credsQuery, [credentialsid]);
    if (rows.length === 1) {
        return dbobjects.getCredentialsFromDbRow(rows[0]);
    }
    else if (rows.length === 0) {
        log.warn({
            credentialsid, credsQuery, rows,
            func: 'getBluemixCredentialsById',
        }, 'Credentials not found');
    }
    else {
        log.error({
            credentialsid, credsQuery, rows,
            func: 'getBluemixCredentialsById',
        }, 'Unexpected response from DB');
    }
    throw new Error('Unexpected response when retrieving the service credentials');
}
exports.getBluemixCredentialsById = getBluemixCredentialsById;
async function countBluemixCredentialsByType(classid) {
    const credsQuery = 'SELECT `servicetype`, `credstypeid`, count(*) as count ' +
        'FROM `bluemixcredentials` ' +
        'WHERE `classid` = ? ' +
        'GROUP BY `servicetype`, `credstypeid`';
    const rows = await dbExecute(credsQuery, [classid]);
    const counts = { conv: 0, visrec: 0 };
    for (const row of rows) {
        if (row.servicetype === 'conv') {
            if (row.credstypeid === projectObjects.credsTypesByLabel.conv_standard.id) {
                counts.conv += (20 * row.count);
            }
            else {
                counts.conv += (5 * row.count);
            }
        }
        else if (row.servicetype === 'visrec') {
            counts.visrec += (2 * row.count);
        }
        else {
            log.error({ row, classid }, 'Unexpected bluemix service type found in DB');
        }
    }
    return counts;
}
exports.countBluemixCredentialsByType = countBluemixCredentialsByType;
async function countGlobalBluemixCredentials() {
    const credsQuery = 'SELECT `classid`, ' +
        'sum(case when servicetype = "conv" then 1 else 0 end) conv, ' +
        'sum(case when servicetype = "visrec" then 1 else 0 end) visrec ' +
        'FROM `bluemixcredentials` ' +
        'GROUP BY `classid`';
    const rows = await dbExecute(credsQuery, []);
    const counts = {};
    for (const row of rows) {
        const conv = parseInt(row.conv, 10);
        const visrec = parseInt(row.visrec, 10);
        const total = conv + visrec;
        counts[row.classid] = { conv, visrec, total };
    }
    return counts;
}
exports.countGlobalBluemixCredentials = countGlobalBluemixCredentials;
async function deleteBluemixCredentials(credentialsid) {
    const queryString = 'DELETE FROM `bluemixcredentials` WHERE `id` = ?';
    const response = await dbExecute(queryString, [credentialsid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete credentials info');
    }
}
exports.deleteBluemixCredentials = deleteBluemixCredentials;
async function deleteClassifiersByCredentials(credentials) {
    const queryString = 'DELETE FROM `bluemixclassifiers` WHERE `credentialsid` = ?';
    const response = await dbExecute(queryString, [credentials.id]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete credentials info');
    }
}
exports.deleteClassifiersByCredentials = deleteClassifiersByCredentials;
async function getNumbersClassifiers(projectid) {
    const queryString = 'SELECT `projectid`, `userid`, `classid`, ' +
        '`created`, `status` ' +
        'FROM `taxinoclassifiers` ' +
        'WHERE `projectid` = ?';
    const rows = await dbExecute(queryString, [projectid]);
    return rows.map(dbobjects.getNumbersClassifierFromDbRow);
}
exports.getNumbersClassifiers = getNumbersClassifiers;
async function getConversationWorkspaces(projectid) {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `language`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `projectid` = ?';
    const rows = await dbExecute(queryString, [projectid]);
    return rows.map(dbobjects.getWorkspaceFromDbRow);
}
exports.getConversationWorkspaces = getConversationWorkspaces;
async function getConversationWorkspace(projectid, classifierid) {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `language`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `projectid` = ? AND `classifierid` = ?';
    const rows = await dbExecute(queryString, [projectid, classifierid]);
    if (rows.length === 1) {
        return dbobjects.getWorkspaceFromDbRow(rows[0]);
    }
    else if (rows.length > 1) {
        log.error({ projectid, classifierid, rows, func: 'getConversationWorkspace' }, 'Unexpected response from DB');
    }
    else {
        log.warn({ projectid, classifierid, func: 'getConversationWorkspace' }, 'Conversation workspace not found');
    }
    throw new Error('Unexpected response when retrieving conversation workspace details');
}
exports.getConversationWorkspace = getConversationWorkspace;
async function countConversationWorkspaces(classid) {
    const queryString = 'SELECT COUNT(*) AS count ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `classid` = ?';
    const rows = await dbExecute(queryString, [classid]);
    if (rows.length !== 1) {
        return 0;
    }
    return rows[0].count;
}
exports.countConversationWorkspaces = countConversationWorkspaces;
async function storeConversationWorkspace(credentials, project, workspace) {
    const obj = dbobjects.createConversationWorkspace(workspace, credentials, project);
    const queryString = 'INSERT INTO `bluemixclassifiers` ' +
        '(`id`, `credentialsid`, ' +
        '`projectid`, `userid`, `classid`, ' +
        '`servicetype`, ' +
        '`classifierid`, `url`, `name`, `language`, ' +
        '`created`, `expiry`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [obj.id, obj.credentialsid,
        obj.projectid, obj.userid, obj.classid,
        obj.servicetype,
        obj.classifierid, obj.url, obj.name, obj.language,
        obj.created, obj.expiry];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response }, 'Failed to store workspace info');
        throw new Error('Failed to store workspace');
    }
    return workspace;
}
exports.storeConversationWorkspace = storeConversationWorkspace;
async function updateConversationWorkspaceExpiry(workspace) {
    const queryString = 'UPDATE `bluemixclassifiers` ' +
        'SET `created` = ?, `expiry` = ? ' +
        'WHERE `id` = ?';
    const values = [workspace.created, workspace.expiry, workspace.id];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ queryString, values, response }, 'Failed to update expiry date');
        throw new Error('Conversation Workspace expiry not updated');
    }
}
exports.updateConversationWorkspaceExpiry = updateConversationWorkspaceExpiry;
async function getExpiredConversationWorkspaces() {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `language`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `expiry` < ? AND `servicetype` = ?';
    const rows = await dbExecute(queryString, [new Date(), 'conv']);
    return rows.map(dbobjects.getWorkspaceFromDbRow);
}
exports.getExpiredConversationWorkspaces = getExpiredConversationWorkspaces;
async function storeNumbersClassifier(userid, classid, projectid, status) {
    const obj = dbobjects.createNumbersClassifier(userid, classid, projectid, status);
    const queryString = 'REPLACE INTO `taxinoclassifiers` ' +
        '(`projectid`, `userid`, `classid`, ' +
        '`created`, `status`) ' +
        'VALUES (?, ?, ?, ?, ?)';
    const values = [obj.projectid, obj.userid, obj.classid, obj.created, obj.status];
    const response = await dbExecute(queryString, values);
    if (response.warningStatus !== 0) {
        log.error({ response }, 'Failed to store classifier info');
        throw new Error('Failed to store classifier');
    }
    return dbobjects.getNumbersClassifierFromDbRow(obj);
}
exports.storeNumbersClassifier = storeNumbersClassifier;
async function deleteConversationWorkspace(id) {
    const queryString = 'DELETE FROM `bluemixclassifiers` WHERE `id` = ? AND `servicetype` = ?';
    const response = await dbExecute(queryString, [id, 'conv']);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete classifiers info');
    }
}
exports.deleteConversationWorkspace = deleteConversationWorkspace;
async function deleteConversationWorkspacesByProjectId(projectid) {
    const queryString = 'DELETE FROM `bluemixclassifiers` WHERE `projectid` = ?';
    const response = await dbExecute(queryString, [projectid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete classifiers info');
    }
}
exports.deleteConversationWorkspacesByProjectId = deleteConversationWorkspacesByProjectId;
async function storeImageClassifier(credentials, project, classifier) {
    const obj = dbobjects.createVisualClassifier(classifier, credentials, project);
    const queryString = 'INSERT INTO `bluemixclassifiers` ' +
        '(`id`, `credentialsid`, ' +
        '`projectid`, `userid`, `classid`, ' +
        '`servicetype`, ' +
        '`classifierid`, `url`, `name`, `language`, ' +
        '`created`, `expiry`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [obj.id, obj.credentialsid,
        obj.projectid, obj.userid, obj.classid,
        obj.servicetype,
        obj.classifierid, obj.url, obj.name, obj.language,
        obj.created, obj.expiry];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response }, 'Failed to store classifier info');
        throw new Error('Failed to store classifier');
    }
    return classifier;
}
exports.storeImageClassifier = storeImageClassifier;
async function getImageClassifiers(projectid) {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `projectid` = ?';
    const rows = await dbExecute(queryString, [projectid]);
    return rows.map(dbobjects.getVisualClassifierFromDbRow);
}
exports.getImageClassifiers = getImageClassifiers;
async function getImageClassifier(projectid, classifierid) {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `projectid` = ? AND `classifierid` = ?';
    const rows = await dbExecute(queryString, [projectid, classifierid]);
    if (rows.length === 1) {
        return dbobjects.getVisualClassifierFromDbRow(rows[0]);
    }
    if (rows.length > 1) {
        log.error({ rows, func: 'getImageClassifier' }, 'Unexpected response from DB');
    }
    else {
        log.warn({ projectid, classifierid, func: 'getImageClassifier' }, 'Image classifier not found');
    }
    throw new Error('Unexpected response when retrieving image classifier details');
}
exports.getImageClassifier = getImageClassifier;
async function deleteImageClassifier(id) {
    const queryString = 'DELETE FROM `bluemixclassifiers` WHERE `id` = ? AND `servicetype` = ?';
    const response = await dbExecute(queryString, [id, 'visrec']);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete classifiers info');
    }
}
exports.deleteImageClassifier = deleteImageClassifier;
async function getExpiredImageClassifiers() {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `language`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `expiry` < ? AND `servicetype` = ?';
    const rows = await dbExecute(queryString, [new Date(), 'visrec']);
    return rows.map(dbobjects.getVisualClassifierFromDbRow);
}
exports.getExpiredImageClassifiers = getExpiredImageClassifiers;
async function getProjectsWithBluemixClassifiers(classid) {
    const queryString = 'SELECT `projectid`, `classifierid` FROM `bluemixclassifiers` WHERE `classid` = ?';
    const projects = {};
    const rows = await dbExecute(queryString, [classid]);
    rows.forEach((row) => {
        projects[row.projectid] = row.classifierid;
    });
    return projects;
}
exports.getProjectsWithBluemixClassifiers = getProjectsWithBluemixClassifiers;
async function getClassifierByBluemixId(classifierid) {
    const queryString = 'SELECT `id`, `credentialsid`, `projectid`, `servicetype`,' +
        ' `classifierid`, `url`, `name`, `language`, `created`, `expiry` ' +
        'FROM `bluemixclassifiers` ' +
        'WHERE `classifierid` = CONVERT(? USING latin1)';
    const rows = await dbExecute(queryString, [classifierid]);
    if (rows.length === 0) {
        return;
    }
    else if (rows.length === 1) {
        const classifierType = rows[0].servicetype;
        switch (classifierType) {
            case 'conv':
                return dbobjects.getWorkspaceFromDbRow(rows[0]);
            case 'visrec':
                return dbobjects.getVisualClassifierFromDbRow(rows[0]);
            default:
                log.error({ rows, func: 'getClassifierByBluemixId' }, 'Unexpected response from DB');
                throw new Error('Unspected response when retrieving Bluemix classifier details');
        }
    }
    else {
        log.error({ rows, func: 'getClassifierByBluemixId' }, 'Unexpected response from DB');
        throw new Error('Unspected response when retrieving Bluemix classifier details');
    }
}
exports.getClassifierByBluemixId = getClassifierByBluemixId;
// -----------------------------------------------------------------------------
//
// SCRATCH KEYS
//
// -----------------------------------------------------------------------------
async function storeUntrainedScratchKey(project) {
    const obj = dbobjects.createUntrainedScratchKey(project.name, project.type, project.id);
    const queryString = 'INSERT INTO `scratchkeys` ' +
        '(`id`, ' +
        '`projectid`, `projectname`, `projecttype`, ' +
        '`userid`, `classid`, `updated`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [
        obj.id,
        project.id, obj.name, obj.type,
        project.userid, project.classid, obj.updated,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response }, 'Failed to store Scratch key');
        throw new Error('Failed to store Scratch key');
    }
    return obj.id;
}
exports.storeUntrainedScratchKey = storeUntrainedScratchKey;
function resetExpiredScratchKey(id, projecttype) {
    const queryString = 'UPDATE `scratchkeys` ' +
        'SET `classifierid` = ? , ' +
        '`serviceurl` = ? , `serviceusername` = ? , `servicepassword` = ?, ' +
        '`updated` = ? ' +
        'WHERE `classifierid` = ? AND `projecttype` = ?';
    const values = [
        null, null, null, null,
        new Date(),
        id, projecttype,
    ];
    return dbExecute(queryString, values);
}
exports.resetExpiredScratchKey = resetExpiredScratchKey;
function removeCredentialsFromScratchKeys(credentials) {
    const queryString = 'UPDATE `scratchkeys` ' +
        'SET `classifierid` = ? , ' +
        '`serviceurl` = ? , `serviceusername` = ? , `servicepassword` = ?, ' +
        '`updated` = ? ' +
        'WHERE `serviceusername` = ? AND `servicepassword` = ? AND `classid` = ?';
    const values = [
        null, null, null, null,
        new Date(),
        credentials.username, credentials.password, credentials.classid,
    ];
    return dbExecute(queryString, values);
}
exports.removeCredentialsFromScratchKeys = removeCredentialsFromScratchKeys;
/**
 * @returns the ScratchKey ID - whether created or updated
 */
async function storeOrUpdateScratchKey(project, credentials, classifierid, timestamp) {
    const existing = await findScratchKeys(project.userid, project.id, project.classid);
    if (existing.length > 0) {
        return updateScratchKey(existing[0].id, project.userid, project.id, project.classid, credentials, classifierid, timestamp);
    }
    else {
        return storeScratchKey(project, credentials, classifierid, timestamp);
    }
}
exports.storeOrUpdateScratchKey = storeOrUpdateScratchKey;
/**
 * @returns the created scratchkey ID
 */
async function storeScratchKey(project, credentials, classifierid, timestamp) {
    const obj = dbobjects.createScratchKey(credentials, project.name, project.type, project.id, classifierid, timestamp);
    const queryString = 'INSERT INTO `scratchkeys` ' +
        '(`id`, `projectname`, `projecttype`, ' +
        '`serviceurl`, `serviceusername`, `servicepassword`, ' +
        '`classifierid`, ' +
        '`projectid`, `userid`, `classid`, `updated`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [
        obj.id, project.name, project.type,
        obj.credentials ? obj.credentials.url : undefined,
        obj.credentials ? obj.credentials.username : undefined,
        obj.credentials ? obj.credentials.password : undefined,
        obj.classifierid,
        obj.projectid, project.userid, project.classid,
        obj.updated,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response, queryString, values }, 'Failed to store Scratch key');
        throw new Error('Failed to store Scratch key');
    }
    return obj.id;
}
exports.storeScratchKey = storeScratchKey;
/**
 * @returns scratchKeyId
 */
async function updateScratchKey(scratchKeyId, userid, projectid, classid, credentials, classifierid, timestamp) {
    const queryString = 'UPDATE `scratchkeys` ' +
        'SET `classifierid` = ? , ' +
        '`updated` = ?, ' +
        '`serviceurl` = ? , `serviceusername` = ? , `servicepassword` = ? ' +
        'WHERE `id` = ? AND ' +
        '`userid` = ? AND `projectid` = ? AND `classid` = ?';
    const values = [
        classifierid,
        timestamp,
        credentials.url, credentials.username, credentials.password,
        scratchKeyId,
        userid, projectid, classid,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ queryString, values, response }, 'Failed to update scratchkey');
        throw new Error('Scratch key not updated');
    }
    return scratchKeyId;
}
async function updateScratchKeyTimestamp(project, timestamp) {
    const queryString = 'UPDATE `scratchkeys` ' +
        'SET `updated` = ? ' +
        'WHERE `userid` = ? AND `projectid` = ? AND `classid` = ?';
    const values = [
        timestamp,
        project.userid, project.id, project.classid,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ queryString, values, response }, 'Failed to update scratchkey timestamp');
        throw new Error('Scratch key timestamp not updated');
    }
}
exports.updateScratchKeyTimestamp = updateScratchKeyTimestamp;
async function getScratchKey(key) {
    const queryString = 'SELECT ' +
        '`id`, `classid`, ' +
        '`projectid`, `projectname`, `projecttype`, ' +
        '`serviceurl`, `serviceusername`, `servicepassword`, ' +
        '`classifierid`, `updated` ' +
        'FROM `scratchkeys` ' +
        'WHERE `id` = ?';
    const rows = await dbExecute(queryString, [key]);
    if (rows.length === 1) {
        return dbobjects.getScratchKeyFromDbRow(rows[0]);
    }
    if (rows.length === 0) {
        log.warn({ key, func: 'getScratchKey' }, 'Scratch key not found');
    }
    else if (rows.length > 1) {
        log.error({ rows, key, func: 'getScratchKey' }, 'Unexpected response from DB');
    }
    throw new Error('Unexpected response when retrieving credentials for Scratch');
}
exports.getScratchKey = getScratchKey;
async function findScratchKeys(userid, projectid, classid) {
    const queryString = 'SELECT ' +
        '`id`, `classid`, `projectid`, `projectname`, `projecttype`, ' +
        '`serviceurl`, `serviceusername`, `servicepassword`, ' +
        '`classifierid`, `updated` ' +
        'FROM `scratchkeys` ' +
        'WHERE `projectid` = ? AND `userid` = ? AND `classid` = ?';
    const values = [projectid, userid, classid];
    const rows = await dbExecute(queryString, values);
    return rows.map(dbobjects.getScratchKeyFromDbRow);
}
exports.findScratchKeys = findScratchKeys;
async function deleteScratchKey(id) {
    const queryString = 'DELETE FROM `scratchkeys` WHERE `id` = ?';
    const response = await dbExecute(queryString, [id]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete scratch key info');
    }
}
exports.deleteScratchKey = deleteScratchKey;
async function deleteScratchKeysByProjectId(projectid) {
    const queryString = 'DELETE FROM `scratchkeys` WHERE `projectid` = ?';
    const response = await dbExecute(queryString, [projectid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete scratch key info');
    }
}
exports.deleteScratchKeysByProjectId = deleteScratchKeysByProjectId;
// -----------------------------------------------------------------------------
//
// KNOWN SYSTEM ERRORS
//
// -----------------------------------------------------------------------------
async function getAllKnownErrors() {
    const queryString = 'SELECT * FROM `knownsyserrors`';
    const rows = await dbExecute(queryString, []);
    return rows.map(dbobjects.getKnownErrorFromDbRow);
}
exports.getAllKnownErrors = getAllKnownErrors;
async function storeNewKnownError(type, service, objectid) {
    const knownError = dbobjects.createKnownError(type, service, objectid);
    const queryString = 'INSERT INTO `knownsyserrors` ' +
        '(`id`, `type`, `servicetype`, `objid`) ' +
        'VALUES (?, ?, ?, ?)';
    const values = [knownError.id, knownError.type, knownError.servicetype, knownError.objid];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response, values, knownError }, 'Failed to store known error');
        throw new Error('Failed to store known error');
    }
    return knownError;
}
exports.storeNewKnownError = storeNewKnownError;
// only used for unit tests
function deleteAllKnownErrors() {
    return dbExecute('DELETE FROM `knownsyserrors`', []);
}
exports.deleteAllKnownErrors = deleteAllKnownErrors;
// -----------------------------------------------------------------------------
//
// PENDING JOBS
//
// -----------------------------------------------------------------------------
function deleteAllPendingJobs() {
    return dbExecute('DELETE FROM `pendingjobs`', []);
}
exports.deleteAllPendingJobs = deleteAllPendingJobs;
async function storePendingJob(job) {
    const queryString = 'INSERT INTO `pendingjobs` ' +
        '(`id`, `jobtype`, `jobdata`, `attempts`) ' +
        'VALUES (?, ?, ?, ?)';
    const values = [
        job.id,
        job.jobtype,
        JSON.stringify(job.jobdata),
        job.attempts,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response, job }, 'Failed to store pending job');
        throw new Error('Failed to store pending job');
    }
    return job;
}
function storeDeleteObjectJob(classid, userid, projectid, objectid) {
    const obj = dbobjects.createDeleteObjectStoreJob({ classid, userid, projectid, objectid });
    return storePendingJob(obj);
}
exports.storeDeleteObjectJob = storeDeleteObjectJob;
function storeDeleteProjectObjectsJob(classid, userid, projectid) {
    const obj = dbobjects.createDeleteProjectObjectsJob({ classid, userid, projectid });
    return storePendingJob(obj);
}
exports.storeDeleteProjectObjectsJob = storeDeleteProjectObjectsJob;
function storeDeleteUserObjectsJob(classid, userid) {
    const obj = dbobjects.createDeleteUserObjectsJob({ classid, userid });
    return storePendingJob(obj);
}
exports.storeDeleteUserObjectsJob = storeDeleteUserObjectsJob;
function storeDeleteClassObjectsJob(classid) {
    const obj = dbobjects.createDeleteClassObjectsJob({ classid });
    return storePendingJob(obj);
}
exports.storeDeleteClassObjectsJob = storeDeleteClassObjectsJob;
async function recordUnsuccessfulPendingJobExecution(job) {
    const attempts = job.attempts + 1;
    const lastattempt = new Date();
    const queryString = 'UPDATE `pendingjobs` ' +
        'SET `attempts` = ?, `lastattempt` = ? ' +
        'WHERE `id` = ?';
    const values = [attempts, lastattempt, job.id];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ queryString, values, job }, 'Failed to update pending job');
        throw new Error('Pending job not updated');
    }
    return {
        id: job.id,
        jobtype: job.jobtype,
        jobdata: job.jobdata,
        attempts,
        lastattempt,
    };
}
exports.recordUnsuccessfulPendingJobExecution = recordUnsuccessfulPendingJobExecution;
async function deletePendingJob(job) {
    const queryString = 'DELETE from `pendingjobs` where `id` = ?';
    const values = [job.id];
    const response = await dbExecute(queryString, values);
    if (response.warningStatus !== 0) {
        log.error({ job, response, values }, 'Failed to delete pending job');
        throw new Error('Failed to delete pending job');
    }
}
exports.deletePendingJob = deletePendingJob;
async function getNextPendingJob() {
    const queryString = 'SELECT * from `pendingjobs` ORDER BY `id` LIMIT 1';
    const rows = await dbExecute(queryString, []);
    if (rows.length === 0) {
        // no more jobs to do - yay
        return undefined;
    }
    else if (rows.length === 1) {
        // found a job to do - that's okay
        return dbobjects.getPendingJobFromDbRow(rows[0]);
    }
    else {
        // should never get here.... because the SQL says LIMIT 1!
        log.error({ rows, func: 'getNextPendingJob' }, 'Unexpected response from DB');
        throw new Error('Unexpected response when retrieving pending job from DB');
    }
}
exports.getNextPendingJob = getNextPendingJob;
// -----------------------------------------------------------------------------
//
// TENANT INFO
//
// -----------------------------------------------------------------------------
async function storeManagedClassTenant(classid, numstudents) {
    const obj = dbobjects.createClassTenant(classid);
    const IS_MANAGED = true;
    const NUM_USERS = numstudents + 1;
    const queryString = 'INSERT INTO `tenants` ' +
        '(`id`, `projecttypes`, `ismanaged`, ' +
        '`maxusers`, `maxprojectsperuser`, ' +
        '`textclassifiersexpiry`, `imageclassifiersexpiry`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [
        obj.id, obj.projecttypes,
        IS_MANAGED, NUM_USERS,
        obj.maxprojectsperuser,
        obj.textclassifiersexpiry, obj.imageclassifiersexpiry,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1) {
        log.error({ response, values }, 'Failed to store managed tenant');
        throw new Error('Failed to store managed tenant');
    }
    const created = {
        id: obj.id,
        supportedProjectTypes: obj.projecttypes.split(','),
        isManaged: IS_MANAGED,
        maxUsers: NUM_USERS,
        maxProjectsPerUser: obj.maxprojectsperuser,
        textClassifierExpiry: obj.textclassifiersexpiry,
        imageClassifierExpiry: obj.imageclassifiersexpiry,
    };
    return created;
}
exports.storeManagedClassTenant = storeManagedClassTenant;
async function getClassTenant(classid) {
    const queryString = 'SELECT `id`, `projecttypes`, `maxusers`, ' +
        '`maxprojectsperuser`, ' +
        '`textclassifiersexpiry`, `imageclassifiersexpiry`, ' +
        '`ismanaged` ' +
        'FROM `tenants` ' +
        'WHERE `id` = ?';
    const rows = await dbExecute(queryString, [classid]);
    if (rows.length === 0) {
        log.debug({ rows, func: 'getClassTenant' }, 'Empty response from DB');
        return dbobjects.getDefaultClassTenant(classid);
    }
    else if (rows.length > 1) {
        log.error({ rows, func: 'getClassTenant' }, 'Unexpected response from DB');
        return dbobjects.getDefaultClassTenant(classid);
    }
    else {
        return dbobjects.getClassFromDbRow(rows[0]);
    }
}
exports.getClassTenant = getClassTenant;
async function modifyClassTenantExpiries(classid, textexpiry, imageexpiry) {
    const tenantinfo = await getClassTenant(classid);
    const modified = dbobjects.setClassTenantExpiries(tenantinfo, textexpiry, imageexpiry);
    const obj = dbobjects.getClassDbRow(modified);
    const queryString = 'INSERT INTO `tenants` ' +
        '(`id`, `projecttypes`, ' +
        '`maxusers`, `maxprojectsperuser`, ' +
        '`textclassifiersexpiry`, `imageclassifiersexpiry`, ' +
        '`ismanaged`) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE `textclassifiersexpiry` = ?, ' +
        '`imageclassifiersexpiry` = ?';
    const values = [
        obj.id, obj.projecttypes,
        obj.maxusers, obj.maxprojectsperuser,
        obj.textclassifiersexpiry, obj.imageclassifiersexpiry,
        obj.ismanaged,
        //
        obj.textclassifiersexpiry, obj.imageclassifiersexpiry,
    ];
    const response = await dbExecute(queryString, values);
    if (response.affectedRows !== 1 && // row inserted
        response.affectedRows !== 2) // row updated
     {
        log.error({ response, values }, 'Failed to update tenant info');
        throw new Error('Failed to update tenant info');
    }
    return modified;
}
exports.modifyClassTenantExpiries = modifyClassTenantExpiries;
async function deleteClassTenant(classid) {
    const deleteQuery = 'DELETE FROM `tenants` WHERE `id` = ?';
    const response = await dbExecute(deleteQuery, [classid]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete class tenant');
    }
}
exports.deleteClassTenant = deleteClassTenant;
/**
 * Checks the list of disruptive tenants to see if the provided class id
 * is on the list.
 *
 * "Disruptive" tenants are classes that have caused thousands of
 * notifications about training failures, who consistently ignore
 * warnings of insufficient API keys, and consistently ignore UI
 * requests to stop training new models even after rate limiting is
 * introduced.
 *
 * With the current implementation, where I receive a notification
 * to my mobile phone in the event of a training failure, this
 * is, at best, disruptive. Thousands of alert notifications in
 * an evening, aside from flattening my mobile phone battery,
 * makes it impossible for me to monitor or support other classes.
 *
 * For such classes, all errors are ignored.
 *
 * @returns true if the tenant ID is on the disruptive list
 */
function isTenantDisruptive(tenantid) {
    return isStringInListTable(tenantid, 'disruptivetenants');
}
exports.isTenantDisruptive = isTenantDisruptive;
/**
 * Checks the list of notification opt-outs to see if the provided class id
 * is on the list.
 *
 * Most of these are tenants run by users who make regular usage of Bluemix
 * API keys and do not need to be notified of usage outside of ML for Kids.
 *
 * @returns true if the tenant ID is on the opt-out list
 */
function hasTenantOptedOutOfNotifications(tenantid) {
    return isStringInListTable(tenantid, 'notificationoptouts');
}
exports.hasTenantOptedOutOfNotifications = hasTenantOptedOutOfNotifications;
/** Helper function to see if the provided value is contained in the provided single-column table. */
async function isStringInListTable(value, tablename) {
    const queryString = 'SELECT exists (' +
        'SELECT * from `' + tablename + '` ' +
        'WHERE `id` = ? ' +
        'LIMIT 1' +
        ') as stringinlist';
    const rows = await dbExecute(queryString, [value]);
    return dbobjects.getAsBoolean(rows[0], 'stringinlist');
}
// -----------------------------------------------------------------------------
//
// TEMPORARY SESSION USERS
//
// -----------------------------------------------------------------------------
function testonly_resetSessionUsersStore() {
    return dbExecute('DELETE FROM `sessionusers`', []);
}
exports.testonly_resetSessionUsersStore = testonly_resetSessionUsersStore;
async function storeTemporaryUser(lifespan) {
    const obj = dbobjects.createTemporaryUser(lifespan);
    const insertUserQry = 'INSERT INTO `sessionusers` ' +
        '(`id`, `token`, `sessionexpiry`) ' +
        'VALUES (?, ?, ?)';
    const insertUserValues = [obj.id, obj.token, obj.sessionexpiry];
    const response = await dbExecute(insertUserQry, insertUserValues);
    if (response.affectedRows === 1) {
        return dbobjects.getTemporaryUserFromDbRow(obj);
    }
    throw new Error('Failed to store temporary user');
}
exports.storeTemporaryUser = storeTemporaryUser;
async function getTemporaryUser(id) {
    const queryString = 'SELECT `id`, `token`, `sessionexpiry` ' +
        'FROM `sessionusers` ' +
        'WHERE `id` = ?';
    const rows = await dbExecute(queryString, [id]);
    if (rows.length !== 1) {
        log.warn({ id }, 'Temporary user not found');
        return;
    }
    return dbobjects.getTemporaryUserFromDbRow(rows[0]);
}
exports.getTemporaryUser = getTemporaryUser;
async function deleteTemporaryUser(user) {
    const queryString = 'DELETE FROM `sessionusers` WHERE `id` = ?';
    const response = await dbExecute(queryString, [user.id]);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete temporary user');
    }
}
exports.deleteTemporaryUser = deleteTemporaryUser;
async function countTemporaryUsers() {
    const queryString = 'SELECT COUNT(*) AS count FROM `sessionusers`';
    const rows = await dbExecute(queryString, []);
    if (rows.length !== 1) {
        return 0;
    }
    return rows[0].count;
}
exports.countTemporaryUsers = countTemporaryUsers;
async function getExpiredTemporaryUsers() {
    const queryString = 'SELECT `id`, `token`, `sessionexpiry` ' +
        'FROM `sessionusers` ' +
        'WHERE `sessionexpiry` < ? ' +
        'LIMIT 50';
    const rows = await dbExecute(queryString, [new Date()]);
    return rows.map(dbobjects.getTemporaryUserFromDbRow);
}
exports.getExpiredTemporaryUsers = getExpiredTemporaryUsers;
async function bulkDeleteTemporaryUsers(users) {
    const queryPlaceholders = [];
    const ids = users.map((user) => {
        queryPlaceholders.push('?');
        return user.id;
    });
    const deleteQueryString = 'DELETE FROM `sessionusers` WHERE `id` IN (' + queryPlaceholders.join(',') + ')';
    const response = await dbExecute(deleteQueryString, ids);
    if (response.warningStatus !== 0) {
        throw new Error('Failed to delete temporary users');
    }
}
exports.bulkDeleteTemporaryUsers = bulkDeleteTemporaryUsers;
// -----------------------------------------------------------------------------
//
// SITE ALERTS
//
// -----------------------------------------------------------------------------
function testonly_resetSiteAlertsStore() {
    return dbExecute('DELETE FROM `sitealerts`', []);
}
exports.testonly_resetSiteAlertsStore = testonly_resetSiteAlertsStore;
async function storeSiteAlert(message, url, audience, severity, expiry) {
    let obj;
    try {
        obj = dbobjects.createSiteAlert(message, url, audience, severity, expiry);
    }
    catch (err) {
        err.statusCode = 400;
        throw err;
    }
    const insertAlertQry = 'INSERT INTO `sitealerts` ' +
        '(`timestamp` , `severityid`, `audienceid`, `message`, `url`, `expiry`) ' +
        'VALUES (?, ?, ?, ?, ?, ?)';
    const insertAlertValues = [
        obj.timestamp,
        obj.severityid, obj.audienceid,
        obj.message, obj.url,
        obj.expiry,
    ];
    const response = await dbExecute(insertAlertQry, insertAlertValues);
    if (response.affectedRows === 1) {
        return dbobjects.getSiteAlertFromDbRow(obj);
    }
    throw new Error('Failed to store site alert');
}
exports.storeSiteAlert = storeSiteAlert;
async function getLatestSiteAlert() {
    const queryString = 'SELECT `timestamp` , `severityid`, `audienceid`, `message`, `url`, `expiry` ' +
        'FROM `sitealerts` ' +
        'ORDER BY `timestamp` DESC ' +
        'LIMIT 1';
    const rows = await dbExecute(queryString, []);
    if (rows.length === 1) {
        return dbobjects.getSiteAlertFromDbRow(rows[0]);
    }
    else if (rows.length === 0) {
        return;
    }
    else {
        log.error({ rows, num: rows.length, func: 'getLatestSiteAlert' }, 'Unexpected response from DB');
        return;
    }
}
exports.getLatestSiteAlert = getLatestSiteAlert;
// -----------------------------------------------------------------------------
//
// UBER DELETERS
//
// -----------------------------------------------------------------------------
async function deleteEntireProject(userid, classid, project) {
    switch (project.type) {
        case 'text': {
            const classifiers = await getConversationWorkspaces(project.id);
            for (const classifier of classifiers) {
                await conversation.deleteClassifier(classifier);
            }
            break;
        }
        case 'images': {
            const classifiers = await getImageClassifiers(project.id);
            for (const classifier of classifiers) {
                await visualrec.deleteClassifier(classifier);
            }
            break;
        }
        case 'numbers':
            await numbers.deleteClassifier(userid, classid, project.id);
            break;
        case 'sounds':
            // nothing to do - models all stored client-side
            break;
    }
    const deleteQueries = [
        'DELETE FROM `projects` WHERE `id` = ?',
        'DELETE FROM `numbersprojectsfields` WHERE `projectid` = ?',
        'DELETE FROM `texttraining` WHERE `projectid` = ?',
        'DELETE FROM `numbertraining` WHERE `projectid` = ?',
        'DELETE FROM `imagetraining` WHERE `projectid` = ?',
        'DELETE FROM `soundtraining` WHERE `projectid` = ?',
        'DELETE FROM `bluemixclassifiers` WHERE `projectid` = ?',
        'DELETE FROM `taxinoclassifiers` WHERE `projectid` = ?',
        'DELETE FROM `scratchkeys` WHERE `projectid` = ?',
    ];
    const dbConn = await dbConnPool.getConnection();
    for (const deleteQuery of deleteQueries) {
        await dbConn.execute(deleteQuery, [project.id]);
    }
    dbConn.release();
}
exports.deleteEntireProject = deleteEntireProject;
async function deleteEntireUser(userid, classid) {
    const projects = await getProjectsByUserId(userid, classid);
    for (const project of projects) {
        await deleteEntireProject(userid, classid, project);
    }
    const deleteQueries = [
        'DELETE FROM `projects` WHERE `userid` = ?',
        'DELETE FROM `bluemixclassifiers` WHERE `userid` = ?',
        'DELETE FROM `taxinoclassifiers` WHERE `userid` = ?',
        'DELETE FROM `scratchkeys` WHERE `userid` = ?',
    ];
    const dbConn = await dbConnPool.getConnection();
    for (const deleteQuery of deleteQueries) {
        await dbConn.execute(deleteQuery, [userid]);
    }
    dbConn.release();
}
exports.deleteEntireUser = deleteEntireUser;
async function deleteClassResources(classid) {
    const deleteQueries = [
        'DELETE FROM `bluemixcredentials` WHERE `classid` = ?',
    ];
    const dbConn = await dbConnPool.getConnection();
    for (const deleteQuery of deleteQueries) {
        await dbConn.execute(deleteQuery, [classid]);
    }
    dbConn.release();
}
exports.deleteClassResources = deleteClassResources;
