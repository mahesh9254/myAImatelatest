"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const Mustache = require("mustache");
const he = require("he");
const fileutils = require("../utils/fileutils");
const sound = require("../training/sound");
const env = require("../utils/env");
const ROOT_URL = process.env[env.AUTH0_CALLBACK_URL];
function escapeProjectName(name, version) {
    if (version === 3) {
        // Scratch 3 needs HTML encoding (e.g. '&lt;') as special
        //  characters (e.g. '<') will prevent extensions from
        //  loading
        return he.encode(name);
    }
    else {
        // Scratch 2 displays the string as-is
        return name.replace(/'/g, '\\\'');
    }
}
async function getTextExtension(scratchkey, project, version) {
    const template = await fileutils.read(version === 3 ? './resources/scratch3-text-classify.js' :
        './resources/scratchx-text-classify.js');
    Mustache.parse(template);
    const rendered = Mustache.render(template, {
        projectid: project.id.replace(/-/g, ''),
        statusurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/status',
        classifyurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/classify',
        storeurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/train',
        modelurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/models',
        projectname: escapeProjectName(scratchkey.name, version),
        labels: project.labels.map((name, idx) => {
            return { name, idx };
        }),
        firstlabel: project.labels.length > 0 ? project.labels[0] : '',
    });
    return rendered;
}
async function getImagesExtension(scratchkey, project, version) {
    const template = await fileutils.read(version === 3 ? './resources/scratch3-images-classify.js' :
        './resources/scratchx-images-classify.js');
    Mustache.parse(template);
    const rendered = Mustache.render(template, {
        projectid: project.id.replace(/-/g, ''),
        statusurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/status',
        classifyurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/classify',
        storeurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/train',
        projectname: escapeProjectName(scratchkey.name, version),
        labels: project.labels.map((name, idx) => {
            return { name, idx };
        }),
        firstlabel: project.labels.length > 0 ? project.labels[0] : '',
    });
    return rendered;
}
async function getNumbersExtension(scratchkey, project, version) {
    const allChoices = [];
    if (project.fields) {
        for (const field of project.fields) {
            if (field.type === 'multichoice' && field.choices) {
                for (const choice of field.choices) {
                    if (allChoices.indexOf(choice) === -1) {
                        allChoices.push(choice);
                    }
                }
            }
        }
    }
    const template = await fileutils.read(version === 3 ? './resources/scratch3-numbers-classify.js' :
        './resources/scratchx-numbers-classify.js');
    Mustache.parse(template);
    const rendered = Mustache.render(template, {
        projectid: project.id.replace(/-/g, ''),
        statusurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/status',
        classifyurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/classify',
        storeurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/train',
        modelurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/models',
        projectname: escapeProjectName(scratchkey.name, version),
        labels: project.labels.map((name, idx) => {
            return { name, idx };
        }),
        firstlabel: project.labels.length > 0 ? project.labels[0] : '',
        fields: project.fields ? project.fields.map((field, idx) => {
            return {
                name: field.name,
                type: field.type,
                multichoice: field.type === 'multichoice',
                typeformat: field.type === 'number' ? '%n' : '%s',
                idx,
                menu: field.type === 'multichoice' ? field.choices : [],
                default: field.type === 'multichoice' ?
                    ((field.choices && field.choices.length > 0) ? field.choices[0] : '') :
                    0,
            };
        }) : [],
        choices: allChoices.map((name, idx) => {
            return { name, idx };
        }),
    });
    return rendered;
}
async function getSoundExtension(scratchkey, project, version) {
    const template = await fileutils.read(version === 3 ? './resources/scratch3-sound-classify.js' :
        './resources/scratchx-sound-classify.js');
    Mustache.parse(template);
    const rendered = Mustache.render(template, {
        projectid: project.id.replace(/-/g, ''),
        storeurl: ROOT_URL + '/api/scratch/' + scratchkey.id + '/train',
        projectname: escapeProjectName(scratchkey.name, version),
        labels: project.labels.filter((name) => name !== sound.BACKGROUND_NOISE).map((name, idx) => {
            return { name, idx };
        }),
        firstlabel: project.labels.length > 0 ? project.labels[0] : '',
    });
    return rendered;
}
function getScratchxExtension(scratchkey, project, version) {
    switch (scratchkey.type) {
        case 'text':
            return getTextExtension(scratchkey, project, version);
        case 'images':
            return getImagesExtension(scratchkey, project, version);
        case 'numbers':
            return getNumbersExtension(scratchkey, project, version);
        case 'sounds':
            return getSoundExtension(scratchkey, project, version);
    }
}
exports.getScratchxExtension = getScratchxExtension;
