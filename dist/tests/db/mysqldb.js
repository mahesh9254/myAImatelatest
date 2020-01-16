"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const dbpool = require("../../lib/db/mysqldb");
const store = require("../../lib/db/store");
describe('DB - connections', () => {
    it('should handle disconnecting pool first', () => {
        return dbpool.disconnect();
    });
    it('should handle disconnecting store first', () => {
        return store.disconnect();
    });
    it('should handle multiple connects', async () => {
        await dbpool.connect();
        await dbpool.connect();
        await dbpool.disconnect();
    });
});
