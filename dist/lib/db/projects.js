"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TYPES = {
    text: {
        id: 1,
        label: 'text',
    },
    numbers: {
        id: 2,
        label: 'numbers',
    },
    images: {
        id: 3,
        label: 'images',
    },
    sounds: {
        id: 4,
        label: 'sounds',
    },
};
const typesById = {};
exports.typesById = typesById;
Object.keys(TYPES).forEach((label) => {
    const type = TYPES[label];
    typesById[type.id] = type;
});
const typeLabels = Object.keys(TYPES);
exports.typeLabels = typeLabels;
const typesByLabel = TYPES;
exports.typesByLabel = typesByLabel;
const FIELDTYPES = {
    number: {
        id: 1,
        label: 'number',
    },
    multichoice: {
        id: 2,
        label: 'multichoice',
    },
};
const fieldTypesById = {};
exports.fieldTypesById = fieldTypesById;
Object.keys(FIELDTYPES).forEach((label) => {
    const type = FIELDTYPES[label];
    fieldTypesById[type.id] = type;
});
const fieldTypeLabels = Object.keys(FIELDTYPES);
exports.fieldTypeLabels = fieldTypeLabels;
const fieldTypesByLabel = FIELDTYPES;
exports.fieldTypesByLabel = fieldTypesByLabel;
const CREDSTYPES = {
    unknown: {
        id: 0,
        label: 'unknown',
    },
    conv_lite: {
        id: 1,
        label: 'conv_lite',
    },
    conv_standard: {
        id: 2,
        label: 'conv_standard',
    },
    visrec_lite: {
        id: 3,
        label: 'visrec_lite',
    },
    visrec_standard: {
        id: 4,
        label: 'visrec_standard',
    },
};
const credsTypesById = {};
exports.credsTypesById = credsTypesById;
Object.keys(CREDSTYPES).forEach((label) => {
    const type = CREDSTYPES[label];
    credsTypesById[type.id] = type;
});
const credsTypeLabels = Object.keys(CREDSTYPES);
exports.credsTypeLabels = credsTypeLabels;
const credsTypesByLabel = CREDSTYPES;
exports.credsTypesByLabel = credsTypesByLabel;
