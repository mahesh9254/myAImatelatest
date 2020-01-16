"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const proxyquire = require("proxyquire");
const mockMysqldb = require("./mockmysqldb");
describe('DB store - error handling', () => {
    let stubbedStore;
    before('set up mocks', () => {
        stubbedStore = proxyquire('../../lib/db/store', {
            './mysqldb': mockMysqldb,
        });
        return stubbedStore.init();
    });
    after(() => {
        return stubbedStore.disconnect();
    });
    describe('restartConnection', () => {
        it('should restart the DB connection after READ_ONLY errors', async () => {
            const connBefore = mockMysqldb.connectsCount;
            const discBefore = mockMysqldb.disconnectsCount;
            try {
                await stubbedStore.countProjectsByUserId('UNCOUNTABLE', 'classid');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(mockMysqldb.connectsCount, connBefore + 1);
                assert.strictEqual(mockMysqldb.disconnectsCount, discBefore + 1);
                assert.strictEqual(err.message, 'The MySQL server is running with the --read-only option so it cannot execute this statement');
            }
        });
    });
    describe('getProjectsByUserId', () => {
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.getProjectsByUserId('userid', 'classid');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert(err);
            }
        });
    });
    describe('deleteTextTraining', () => {
        it('should handle errors', async () => {
            try {
                await stubbedStore.deleteTraining('text', 'projectid', 'warningtrainingid');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Failed to delete training');
            }
        });
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.deleteTraining('text', 'projectid', 'trainingid');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Some technical SQL error from deleting training data rows');
            }
        });
    });
    describe('deleteNumberTraining', () => {
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.deleteTraining('numbers', 'projectid', 'trainingid');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Some technical SQL error from deleting training data rows');
            }
        });
    });
    describe('deleteTextTrainingByProjectId', () => {
        it('should handle errors', async () => {
            try {
                await stubbedStore.deleteTrainingByProjectId('text', 'ODDFAIL');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Failed to delete training');
            }
        });
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.deleteTrainingByProjectId('text', 'FAIL');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Some technical sounding SQL error from deleting all the training data rows');
            }
        });
    });
    describe('deleteNumberTrainingByProjectId', () => {
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.deleteTrainingByProjectId('numbers', 'FAIL');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Some technical sounding SQL error from deleting all the training data rows');
            }
        });
    });
    describe('updateLabels', () => {
        it('should handle weird errors', async () => {
            try {
                await stubbedStore.addLabelToProject('userid', 'classid', 'projectid', 'labeltoadd');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'We could not update the labels list in the project');
            }
        });
        it('should handle failures', async () => {
            try {
                await stubbedStore.addLabelToProject('userid', 'classid', 'projectid', 'BANG');
                assert.fail('should not have reached here');
            }
            catch (err) {
                assert.strictEqual(err.message, 'Project not updated');
            }
        });
    });
});
