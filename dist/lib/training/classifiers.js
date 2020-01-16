"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// local dependencies
const store = require("../db/store");
const visrec = require("./visualrecognition");
const conv = require("./conversation");
async function getUnknownTextClassifiers(classid) {
    const unknownTextClassifiers = [];
    let credentialsPool = [];
    // get all of the Bluemix credentials in the class
    try {
        credentialsPool = await store.getBluemixCredentials(classid, 'conv');
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving service credentials') {
            // class doesn't have any Watson Assistant credentials - which is
            // not necessarily an error in this context
            return unknownTextClassifiers;
        }
        // anything else is a legitimate error
        throw err;
    }
    // for each API key...
    for (const credentials of credentialsPool) {
        // get all of the classifiers according to Bluemix / Watson
        const bluemixClassifiers = await conv.getTextClassifiers(credentials);
        // for each Bluemix classifier...
        for (const bluemixClassifier of bluemixClassifiers) {
            // check if it is in the DB
            //  (unless it's in the list of classifiers we know won't be in the DB)
            if (!exports.IGNORE.includes(bluemixClassifier.name)) {
                const classifierInfo = await store.getClassifierByBluemixId(bluemixClassifier.id);
                if (!classifierInfo) {
                    unknownTextClassifiers.push(bluemixClassifier);
                }
            }
        }
    }
    return unknownTextClassifiers;
}
exports.getUnknownTextClassifiers = getUnknownTextClassifiers;
async function getUnknownImageClassifiers(classid) {
    const unknownImageClassifiers = [];
    let credentialsPool = [];
    // get all of the Bluemix credentials in the class
    try {
        credentialsPool = await store.getBluemixCredentials(classid, 'visrec');
    }
    catch (err) {
        if (err.message === 'Unexpected response when retrieving service credentials') {
            // class doesn't have any Visual Recognition credentials - which is
            // not necessarily an error in this context
            return unknownImageClassifiers;
        }
        // anything else is a legitimate error
        throw err;
    }
    // for each API key...
    for (const credentials of credentialsPool) {
        // get all of the classifiers according to Bluemix / Watson
        const bluemixClassifiers = await visrec.getImageClassifiers(credentials);
        // for each Bluemix classifier...
        for (const bluemixClassifier of bluemixClassifiers) {
            // check if it is in the DB
            const classifierInfo = await store.getClassifierByBluemixId(bluemixClassifier.id);
            if (!classifierInfo) {
                unknownImageClassifiers.push(bluemixClassifier);
            }
        }
    }
    return unknownImageClassifiers;
}
exports.getUnknownImageClassifiers = getUnknownImageClassifiers;
function deleteClassifier(type, credentials, classifierid) {
    if (type === 'conv') {
        return conv.deleteClassifierFromBluemix(credentials, classifierid);
    }
    else if (type === 'visrec') {
        return visrec.deleteClassifierFromBluemix(credentials, classifierid);
    }
    else {
        return Promise.resolve();
    }
}
exports.deleteClassifier = deleteClassifier;
/**
 * Names of classifiers that are automatically created by Bluemix services,
 *  and so likely to be found in accounts - not indicative of problems.
 */
exports.IGNORE = [
    'Car Dashboard - Sample',
    'Customer Service - Sample',
];
