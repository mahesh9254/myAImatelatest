"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const sinon = require("sinon");
const slackClient = require("@slack/webhook");
const slack = require("../../lib/notifications/slack");
describe('Notifications - Slack', () => {
    let slackEnv;
    const expectedMessage = 'This is my message';
    const unsendableMessage = 'This message cannot be sent';
    let slackClientStub;
    before(() => {
        slackEnv = process.env.SLACK_WEBHOOK_URL;
        slackClientStub = sinon.stub(slackClient.IncomingWebhook.prototype, 'send')
            .callsFake((msg) => {
            if (typeof msg === 'string') {
                return assert.fail('Missing channel name');
            }
            if (msg.text === expectedMessage) {
                const confirm = {
                    text: msg.text,
                };
                return new Promise((resolve) => {
                    resolve(confirm);
                });
            }
            else if (msg.text === unsendableMessage) {
                const error = new Error('Message cannot be sent');
                const codedError = error;
                codedError.code = slackClient.ErrorCode.HTTPError;
                codedError.original = error;
                return new Promise((resolve, reject) => {
                    reject(codedError);
                });
            }
            else {
                assert.strictEqual(msg.text, expectedMessage);
                assert.strictEqual(msg.channel, 'critical-errors');
            }
            const unexpError = new Error('Message cannot be sent');
            const unexpCodedError = unexpError;
            unexpCodedError.code = slackClient.ErrorCode.HTTPError;
            unexpCodedError.original = unexpError;
            return new Promise((resolve, reject) => {
                reject(unexpCodedError);
            });
        });
    });
    after(() => {
        process.env.SLACK_WEBHOOK_URL = slackEnv;
        slack.close();
        slackClientStub.restore();
    });
    it('init without env var', () => {
        delete process.env.SLACK_WEBHOOK_URL;
        slackClientStub.resetHistory();
        slack.init();
        slack.notify('This is my message which will not be sent', slack.SLACK_CHANNELS.CRITICAL_ERRORS);
        assert.strictEqual(slackClientStub.called, false);
    });
    it('Send message before init', () => {
        slackClientStub.resetHistory();
        slack.notify('This is my message which will not be sent', slack.SLACK_CHANNELS.CRITICAL_ERRORS);
        assert.strictEqual(slackClientStub.called, false);
    });
    it('Send message after init', () => {
        slackClientStub.resetHistory();
        process.env.SLACK_WEBHOOK_URL = 'https://fake.com';
        slack.init();
        slack.notify('This is my message', slack.SLACK_CHANNELS.CRITICAL_ERRORS);
        assert(slackClientStub.called);
    });
    it('Send unsendable message', () => {
        slackClientStub.resetHistory();
        process.env.SLACK_WEBHOOK_URL = 'https://fake.com';
        slack.init();
        slack.notify('This message cannot be sent', slack.SLACK_CHANNELS.CRITICAL_ERRORS);
        assert(slackClientStub.called);
    });
});
