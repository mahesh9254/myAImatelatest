"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const sinon_express_mock_1 = require("sinon-express-mock");
const urlparse = require("../../lib/restapi/images/urlparse");
describe('REST API - image urlparse', () => {
    it('projectUrl', () => {
        const req = sinon_express_mock_1.mockReq({
            params: {
                classid: 'testclass',
                studentid: 'testuser',
                projectid: 'testproject',
            },
        });
        assert.deepStrictEqual(urlparse.projectUrl(req), {
            classid: 'testclass',
            userid: 'testuser',
            projectid: 'testproject',
        });
    });
    it('userUrl', () => {
        const req = sinon_express_mock_1.mockReq({
            params: {
                classid: 'testclass',
                studentid: 'testuser',
            },
        });
        assert.deepStrictEqual(urlparse.userUrl(req), {
            classid: 'testclass',
            userid: 'testuser',
        });
    });
    it('classUrl', () => {
        const req = sinon_express_mock_1.mockReq({
            params: {
                classid: 'testclass',
            },
        });
        assert.deepStrictEqual(urlparse.classUrl(req), {
            classid: 'testclass',
        });
    });
});
