"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SEVERITIES = {
    info: {
        id: 1,
        label: 'info',
    },
    warning: {
        id: 2,
        label: 'warning',
    },
    error: {
        id: 3,
        label: 'error',
    },
};
const severitiesById = {};
exports.severitiesById = severitiesById;
Object.keys(SEVERITIES).forEach((label) => {
    const severity = SEVERITIES[label];
    severitiesById[severity.id] = severity;
});
const severityLabels = Object.keys(SEVERITIES);
exports.severityLabels = severityLabels;
const severitiesByLabel = SEVERITIES;
exports.severitiesByLabel = severitiesByLabel;
const AUDIENCES = {
    // IMPORTANT! These are in numerical order of restrictiveness
    //  so a supervisor (3) can see anything for public (1) or student (2)
    //  and a student (2) can see anything for public (1) but not anything for supervisors (3)
    public: {
        id: 1,
        label: 'public',
    },
    student: {
        id: 2,
        label: 'student',
    },
    supervisor: {
        id: 3,
        label: 'supervisor',
    },
};
const audiencesById = {};
exports.audiencesById = audiencesById;
Object.keys(AUDIENCES).forEach((label) => {
    const audience = AUDIENCES[label];
    audiencesById[audience.id] = audience;
});
const audienceLabels = Object.keys(AUDIENCES);
exports.audienceLabels = audienceLabels;
const audiencesByLabel = AUDIENCES;
exports.audiencesByLabel = audiencesByLabel;
