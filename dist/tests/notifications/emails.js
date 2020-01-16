"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const sinon = require("sinon");
const nodemailer = require("nodemailer");
const auth0 = require("../../lib/auth0/users");
const emails = require("../../lib/notifications/email");
describe('Notifications - Email', () => {
    let hostEnv;
    let portEnv;
    let userEnv;
    let passEnv;
    let replyEnv;
    let auth0Stub;
    let lastEmailText;
    let lastEmailHtml;
    let nodemailerStub;
    const validTransporterStub = {
        verify: sinon.stub().callsFake(() => {
            return Promise.resolve();
        }),
        close: sinon.stub().callsFake(() => {
            return;
        }),
        sendMail: sinon.stub().callsFake((email) => {
            lastEmailText = email.text;
            lastEmailHtml = email.html;
            return Promise.resolve();
        }),
    };
    const invalidTransporterStub = {
        verify: sinon.stub().callsFake(() => {
            return Promise.reject({ err: 'failed' });
        }),
        close: sinon.stub().callsFake(() => {
            throw new Error('Should not be called');
        }),
        sendMail: sinon.stub().callsFake(( /*email: Mailer.Options*/) => {
            return Promise.reject(new Error('should not be called'));
        }),
    };
    before(() => {
        hostEnv = process.env.SMTP_HOST;
        portEnv = process.env.SMTP_PORT;
        userEnv = process.env.SMTP_USER;
        passEnv = process.env.SMTP_PASS;
        replyEnv = process.env.SMTP_REPLY_TO;
        auth0Stub = sinon.stub(auth0, 'getTeacherByClassId').callsFake((tenant) => {
            if (tenant === 'TESTTENANT') {
                const supervisor = {
                    email: 'teacher@email.com',
                };
                return Promise.resolve(supervisor);
            }
            else if (tenant === 'UNKNOWNEMAIL') {
                return Promise.resolve(undefined);
            }
            return Promise.resolve(undefined);
        });
        nodemailerStub = sinon.stub(nodemailer, 'createTransport')
            // @ts-ignore
            .callsFake((options /*, defaults?: SMTPPool.Options*/) => {
            if (options && options.auth && options.auth.user === 'valid-user') {
                const vts = validTransporterStub;
                return vts;
            }
            const its = invalidTransporterStub;
            return its;
        });
    });
    after(() => {
        process.env.SMTP_HOST = hostEnv;
        process.env.SMTP_PORT = portEnv;
        process.env.SMTP_USER = userEnv;
        process.env.SMTP_PASS = passEnv;
        process.env.SMTP_REPLY_TO = replyEnv;
        auth0Stub.restore();
        nodemailerStub.restore();
    });
    function resetEnv() {
        delete process.env.SMTP_HOST;
        delete process.env.SMTP_PORT;
        delete process.env.SMTP_USER;
        delete process.env.SMTP_PASS;
        delete process.env.SMTP_REPLY_TO;
    }
    describe('error handling', () => {
        it('init without env var', async () => {
            resetEnv();
            nodemailerStub.resetHistory();
            await emails.init();
            assert.strictEqual(nodemailerStub.called, false);
        });
        it('init with invalid credentials', async () => {
            process.env.SMTP_HOST = 'invalid.smtp.com';
            process.env.SMTP_PORT = '123';
            process.env.SMTP_USER = 'not-a-valid-user';
            process.env.SMTP_PASS = 'not-the-password';
            process.env.SMTP_REPLY_TO = 'invalid@test.email.com';
            nodemailerStub.resetHistory();
            invalidTransporterStub.verify.resetHistory();
            invalidTransporterStub.sendMail.resetHistory();
            await emails.init();
            await emails.unknownConvClassifier('TESTTENANT', { workspace: 'test' });
            assert(invalidTransporterStub.verify.called);
            assert(invalidTransporterStub.sendMail.notCalled);
        });
        it('Handle classes with no teacher', async () => {
            process.env.SMTP_HOST = 'valid.smtp.com';
            process.env.SMTP_PORT = '123';
            process.env.SMTP_USER = 'valid-user';
            process.env.SMTP_PASS = 'valid-password';
            process.env.SMTP_REPLY_TO = 'valid@test.email.com';
            nodemailerStub.resetHistory();
            validTransporterStub.verify.resetHistory();
            validTransporterStub.sendMail.resetHistory();
            await emails.init();
            await emails.unknownConvClassifier('NOTEACHER', { workspace: 'test' });
            assert(validTransporterStub.verify.called);
            assert(validTransporterStub.sendMail.notCalled);
        });
        it('Handle classes with no teacher email', async () => {
            process.env.SMTP_HOST = 'valid.smtp.com';
            process.env.SMTP_PORT = '123';
            process.env.SMTP_USER = 'valid-user';
            process.env.SMTP_PASS = 'valid-password';
            process.env.SMTP_REPLY_TO = 'valid@test.email.com';
            nodemailerStub.resetHistory();
            validTransporterStub.verify.resetHistory();
            validTransporterStub.sendMail.resetHistory();
            await emails.init();
            await emails.unknownConvClassifier('UNKNOWNEMAIL', { workspace: 'test' });
            assert(validTransporterStub.verify.called);
            assert(validTransporterStub.sendMail.notCalled);
        });
    });
    describe('sending emails', () => {
        beforeEach(() => {
            process.env.SMTP_HOST = 'valid.smtp.com';
            process.env.SMTP_PORT = '123';
            process.env.SMTP_USER = 'valid-user';
            process.env.SMTP_PASS = 'valid-password';
            process.env.SMTP_REPLY_TO = 'valid@test.email.com';
            nodemailerStub.resetHistory();
            validTransporterStub.verify.resetHistory();
            validTransporterStub.sendMail.resetHistory();
            return emails.init();
        });
        afterEach(() => {
            return emails.close();
        });
        it('invalid credentials', async () => {
            await emails.invalidCredentials('TESTTENANT', {
                errormessage: 'your credentials suck',
                userid: 'ibm-cloud-creds',
                servicename: 'Watson Assistant',
            });
            assert(validTransporterStub.verify.called);
            assert(validTransporterStub.sendMail.called);
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('to', 'teacher@email.com')));
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('subject', 'Invalid IBM Cloud credentials')));
            assert.strictEqual(typeof lastEmailText, 'string');
            assert.strictEqual(typeof lastEmailHtml, 'string');
            const txt = lastEmailText;
            assert(txt.startsWith('This is an automated email from Machine Learning for Kids'));
            assert(txt.includes('ibm-cloud-creds (Watson Assistant)'));
            const html = lastEmailHtml;
            assert(html.startsWith('<p><em>This is an automated email from Machine Learning for Kids.</em></p>'));
            assert(html.includes('<code>ibm-cloud-creds</code> (Watson Assistant)</p>'));
        });
        it('unmanaged text classifier', async () => {
            await emails.unknownConvClassifier('TESTTENANT', {
                workspace: 'my-test-workspace',
            });
            assert(validTransporterStub.verify.called);
            assert(validTransporterStub.sendMail.called);
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('to', 'teacher@email.com')));
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('subject', 'Unknown Watson Assistant workspace')));
            assert.strictEqual(typeof lastEmailText, 'string');
            assert.strictEqual(typeof lastEmailHtml, 'string');
            const txt = lastEmailText;
            assert(txt.startsWith('This is an automated email from Machine Learning for Kids'));
            assert(txt.includes('The workspace ID is: my-test-workspace'));
            const html = lastEmailHtml;
            assert(html.startsWith('<p><em>This is an automated email from Machine Learning for Kids.</em></p>'));
            assert(html.includes('<p>The workspace ID is: <code>my-test-workspace</code></p>'));
        });
        it('unmanaged images classifier', async () => {
            await emails.unknownVisrecClassifier('TESTTENANT', {
                classifier: 'my-test-classifier',
            });
            assert(validTransporterStub.verify.called);
            assert(validTransporterStub.sendMail.called);
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('to', 'teacher@email.com')));
            assert(validTransporterStub.sendMail.calledWith(sinon.match.has('subject', 'Unknown Visual Recognition classifier')));
            assert.strictEqual(typeof lastEmailText, 'string');
            assert.strictEqual(typeof lastEmailHtml, 'string');
            const txt = lastEmailText;
            assert(txt.startsWith('This is an automated email from Machine Learning for Kids'));
            assert(txt.includes('The classifier name is: my-test-classifier'));
            const html = lastEmailHtml;
            assert(html.startsWith('<p><em>This is an automated email from Machine Learning for Kids.</em></p>'));
            assert(html.includes('<p>The classifier name is: <code>my-test-classifier</code></p>'));
        });
    });
});
