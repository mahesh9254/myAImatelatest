"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// external dependencies
const nodemailer = require("nodemailer");
const Mustache = require("mustache");
// local dependencies
const fileutils = require("../utils/fileutils");
const auth0 = require("../auth0/users");
const env = require("../utils/env");
const logger_1 = require("../utils/logger");
const log = logger_1.default();
let transporter;
function init() {
    const user = process.env[env.SMTP_USER];
    const pass = process.env[env.SMTP_PASS];
    if (user && pass &&
        process.env[env.SMTP_HOST] && process.env[env.SMTP_PORT] &&
        process.env[env.SMTP_REPLY_TO]) {
        const mailOptions = {
            name: 'machinelearningforkids.co.uk',
            host: process.env[env.SMTP_HOST],
            port: parseInt(process.env[env.SMTP_PORT], 10),
            secure: true,
            auth: { user, pass },
            pool: true,
        };
        const mailDefaults = {
            from: 'Machine Learning for Kids <' + process.env[env.SMTP_USER] + '>',
            replyTo: process.env[env.SMTP_REPLY_TO],
        };
        const verifyTransporter = nodemailer.createTransport(mailOptions, mailDefaults);
        return verifyTransporter.verify()
            .then(() => {
            transporter = verifyTransporter;
            log.info('Email credentials verified');
        })
            .catch((err) => {
            log.error({ err }, 'Failed to verify email credentials. Email sending disabled.');
        });
    }
    else {
        log.info('Missing required fields for sending email. Email sending disabled.');
        return Promise.resolve();
    }
}
exports.init = init;
function close() {
    if (transporter) {
        transporter.close();
        transporter = undefined;
    }
}
exports.close = close;
async function invalidCredentials(tenant, failure) {
    return sendEmail(tenant, EMAILS.invalidcredentials, failure, false);
}
exports.invalidCredentials = invalidCredentials;
async function unknownConvClassifier(tenant, details) {
    return sendEmail(tenant, EMAILS.unmanagedconv, details, false);
}
exports.unknownConvClassifier = unknownConvClassifier;
async function unknownVisrecClassifier(tenant, details) {
    return sendEmail(tenant, EMAILS.unmanagedvisrec, details, false);
}
exports.unknownVisrecClassifier = unknownVisrecClassifier;
async function deletedClass(tenant, teachers) {
    return sendEmailToUser(teachers[0], tenant, EMAILS.deletedclass, { classid: tenant }, true);
}
exports.deletedClass = deletedClass;
const EMAILS = {
    invalidcredentials: {
        root: './resources/email-invalid-ibmcloud-creds.',
        subject: 'Invalid IBM Cloud credentials',
    },
    unmanagedconv: {
        root: './resources/email-unmanaged-conv-classifier.',
        subject: 'Unknown Watson Assistant workspace',
    },
    unmanagedvisrec: {
        root: './resources/email-unmanaged-visrec-classifier.',
        subject: 'Unknown Visual Recognition classifier',
    },
    deletedclass: {
        root: './resources/email-deleted-class.',
        subject: 'Goodbye',
    },
};
async function sendEmail(tenant, templateinfo, values, copyAdmin) {
    if (!transporter) {
        log.error('Skipping sending email as sender not initialized');
        return;
    }
    const teacher = await auth0.getTeacherByClassId(tenant);
    if (!teacher || !teacher.email) {
        log.error({ tenant }, 'Failed to retrieve email address to notify teacher');
        return;
    }
    return sendEmailToUser(teacher, tenant, templateinfo, values, copyAdmin);
}
async function sendEmailToUser(teacher, tenant, templateinfo, values, copyAdmin) {
    if (!transporter) {
        log.error('Skipping sending email as sender not initialized');
        return;
    }
    const TEMPLATE_ROOT = templateinfo.root;
    const templateText = await fileutils.read(TEMPLATE_ROOT + 'txt');
    const templateHtml = await fileutils.read(TEMPLATE_ROOT + 'html');
    const email = {
        subject: templateinfo.subject,
        to: teacher.email,
        bcc: copyAdmin ? 'dale.lane@uk.ibm.com' : [],
        text: Mustache.render(templateText, values),
        html: Mustache.render(templateHtml, values),
    };
    log.info({ tenant, email: teacher.email, subject: templateinfo.subject }, 'Sending email');
    return transporter.sendMail(email);
}
