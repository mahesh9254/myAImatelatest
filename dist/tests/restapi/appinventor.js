"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const request = require("supertest");
const fs = require("fs");
const httpstatus = require("http-status");
const unzip = require("unzipper");
const tmp = require("tmp");
const testserver_1 = require("./testserver");
let testServer;
describe('REST API - App Inventor', () => {
    before(() => {
        testServer = testserver_1.default();
    });
    const binaryParser = (res, cb) => {
        res.setEncoding('binary');
        res.data = '';
        res.on('data', (chunk) => {
            res.data += chunk;
        });
        res.on('end', () => {
            cb(null, Buffer.from(res.data, 'binary'));
        });
    };
    it('should get a modified extension', (done) => {
        const apikey = 'This-is-an-API-key.Sort-of.';
        const zipfile = tmp.fileSync();
        const apifile = tmp.fileSync();
        request(testServer)
            .get('/api/appinventor/' + apikey + '/extension')
            .expect('Content-Disposition', 'attachment; filename=ml4k.aix;')
            .expect(httpstatus.OK)
            .buffer()
            .parse(binaryParser)
            .end((err, res) => {
            assert(!err);
            fs.writeFileSync(zipfile.name, res.body);
            fs.createReadStream(zipfile.name)
                .pipe(unzip.Parse())
                .on('entry', (entry) => {
                if (entry.path === 'com.kylecorry.ml4k/assets/api.txt') {
                    entry.pipe(fs.createWriteStream(apifile.name))
                        .on('finish', () => {
                        const contents = fs.readFileSync(apifile.name, 'utf8');
                        assert.strictEqual(contents, apikey);
                        done();
                    });
                }
                else {
                    entry.autodrain();
                }
            });
        });
    });
});
