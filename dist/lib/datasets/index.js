"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const fs = require("fs");
const store = require("../db/store");
const fileutils = require("../utils/fileutils");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
exports.ERRORS = {
    DATASET_DOES_NOT_EXIST: 'The requested dataset could not be found',
    INVALID_DATASET_ID: 'The requested dataset ID is not valid',
    UNEXPECTED_DATASET_TYPE: 'Cannot import projects using this dataset type',
};
async function importDataset(userid, classid, crowdsource, type, datasetid) {
    // get the location of the dataset (and confirm it exists)
    const location = await getDatasetLocation(type, datasetid);
    // read the dataset in as an object
    const dataset = await fileutils.readJson(location);
    const datasetjson = dataset;
    // prepare the project for importing
    const project = await createProject(userid, classid, crowdsource, type, datasetjson);
    // import the data into the project
    await importDataIntoProject(project, datasetjson);
    return project;
}
exports.importDataset = importDataset;
const VALID_DATASET_IDS = /^[a-z0-9-]{1,30}$/;
/**
 * Gets the location of the specified dataset.
 * This will confirm that the dataset exists and is readable.
 *
 * @param type - type of project the dataset is for (e.g. text, images)
 * @param datasetid - unique ID for the dataset (this is the name of the file it is stored in)
 */
function getDatasetLocation(type, datasetid) {
    return new Promise((resolve, reject) => {
        if (VALID_DATASET_IDS.test(datasetid) === false) {
            const errorObj = new Error(exports.ERRORS.INVALID_DATASET_ID);
            errorObj.statusCode = 400;
            return reject(errorObj);
        }
        const location = './resources/datasets/' + type + '/' + datasetid + '.json';
        fs.access(location, fs.constants.R_OK, (err) => {
            if (err) {
                log.error({ err, location }, 'Failed to access dataset');
                const errorObj = new Error(exports.ERRORS.DATASET_DOES_NOT_EXIST);
                errorObj.statusCode = 400;
                return reject(errorObj);
            }
            return resolve(location);
        });
    });
}
async function createProject(userid, classid, crowdsource, type, dataset) {
    let language = 'en';
    let fields = [];
    const labels = Object.keys(dataset.data);
    if (type === 'text') {
        const textdataset = dataset;
        language = textdataset.metadata.language;
    }
    else if (type === 'numbers') {
        const numbersdataset = dataset;
        fields = numbersdataset.metadata.fields;
    }
    const project = await store.storeProject(userid, classid, type, dataset.metadata.name, language, fields, crowdsource);
    project.labels = await store.replaceLabelsForProject(userid, classid, project.id, labels);
    return project;
}
function importDataIntoProject(project, dataset) {
    if (project.type === 'text') {
        const training = getTextDataToImport(dataset);
        return store.bulkStoreTextTraining(project.id, training);
    }
    else if (project.type === 'numbers') {
        const training = getNumbersDataToImport(dataset);
        return store.bulkStoreNumberTraining(project.id, training);
    }
    else if (project.type === 'images') {
        const training = getImageDataToImport(dataset);
        return store.bulkStoreImageTraining(project.id, training);
    }
    else {
        const failure = new Error(exports.ERRORS.UNEXPECTED_DATASET_TYPE);
        failure.statusCode = 400;
        throw failure;
    }
}
/** Restructure the dataset into a flat list of text items to store. */
function getTextDataToImport(dataset) {
    const training = [];
    const labels = Object.keys(dataset.data);
    for (const label of labels) {
        const items = dataset.data[label];
        for (const item of items) {
            training.push({
                label,
                textdata: item,
            });
        }
    }
    return training;
}
/** Restructure the dataset into a flat list of number items to store. */
function getNumbersDataToImport(dataset) {
    const training = [];
    const key = dataset.metadata.fields.map((field) => {
        if (field.type === 'multichoice' && field.choices) {
            return field.choices.reduce((keymap, item, idx) => {
                keymap[item] = idx;
                return keymap;
            }, {});
        }
        else {
            return {};
        }
    });
    const labels = Object.keys(dataset.data);
    for (const label of labels) {
        const items = dataset.data[label];
        for (const item of items) {
            training.push({
                label,
                numberdata: item.map((val, idx) => {
                    if (dataset.metadata.fields[idx].type === 'multichoice' &&
                        dataset.metadata.fields[idx].choices) {
                        return key[idx][val];
                    }
                    else {
                        return val;
                    }
                }),
            });
        }
    }
    return training;
}
/** Restructure the dataset into a flat list of image url items to store. */
function getImageDataToImport(dataset) {
    const training = [];
    const labels = Object.keys(dataset.data);
    for (const label of labels) {
        const items = dataset.data[label];
        for (const item of items) {
            training.push({
                label,
                imageurl: item,
            });
        }
    }
    return training;
}
