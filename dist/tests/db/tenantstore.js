"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const uuid = require("uuid/v4");
const store = require("../../lib/db/store");
describe('DB store - tenants', () => {
    before(() => {
        return store.init();
    });
    after(() => {
        return store.disconnect();
    });
    it('should retrieve the test tenant policy', async () => {
        const expected = {
            id: 'TESTTENANT',
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: true,
            maxUsers: 8,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 2,
            imageClassifierExpiry: 1,
        };
        const policy = await store.getClassTenant('TESTTENANT');
        assert.deepStrictEqual(policy, expected);
    });
    it('should ignore attempts to delete non-existing tenants', async () => {
        const id = uuid();
        await store.deleteClassTenant(id);
        assert('okay');
    });
    it('should delete a tenant', async () => {
        const id = uuid();
        const newclass = await store.modifyClassTenantExpiries(id, 2, 4);
        let fetched = await store.getClassTenant(id);
        assert.deepStrictEqual(newclass, fetched);
        assert.strictEqual(fetched.textClassifierExpiry, 2);
        assert.strictEqual(fetched.imageClassifierExpiry, 4);
        await store.deleteClassTenant(id);
        fetched = await store.getClassTenant(id);
        assert.strictEqual(fetched.textClassifierExpiry, 24);
        assert.strictEqual(fetched.imageClassifierExpiry, 24);
    });
    it('should modify non-existent tenant policies', async () => {
        const id = uuid();
        const newclass = await store.modifyClassTenantExpiries(id, 100, 40);
        assert.deepStrictEqual(newclass, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 100,
            imageClassifierExpiry: 40,
        });
        const fetched = await store.getClassTenant(id);
        assert.deepStrictEqual(newclass, fetched);
        await store.deleteClassTenant(id);
    });
    it('should modify existing tenant policies', async () => {
        const id = uuid();
        const newclass = await store.modifyClassTenantExpiries(id, 6, 7);
        assert.deepStrictEqual(newclass, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 6,
            imageClassifierExpiry: 7,
        });
        let fetched = await store.getClassTenant(id);
        assert.deepStrictEqual(fetched, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 6,
            imageClassifierExpiry: 7,
        });
        const updated = await store.modifyClassTenantExpiries(id, 12, 14);
        assert.deepStrictEqual(updated, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 12,
            imageClassifierExpiry: 14,
        });
        fetched = await store.getClassTenant(id);
        assert.deepStrictEqual(fetched, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 12,
            imageClassifierExpiry: 14,
        });
        await store.deleteClassTenant(id);
        fetched = await store.getClassTenant(id);
        assert.deepStrictEqual(fetched, {
            id,
            supportedProjectTypes: ['text', 'images', 'numbers', 'sounds'],
            isManaged: false,
            maxUsers: 30,
            maxProjectsPerUser: 3,
            textClassifierExpiry: 24,
            imageClassifierExpiry: 24,
        });
    });
});
