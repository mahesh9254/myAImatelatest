"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const filecompare = require("filecompare");
const fs = require("fs");
const unzip = require("unzipper");
const tmp = require("tmp");
const async = require("async");
const downloadZip = require("../../lib/utils/downloadAndZip");
describe('Utils - download and zip', () => {
    it('should reject non jpg/png files', (done) => {
        downloadZip.run(INVALIDURLS)
            .then(() => {
            done(new Error('Should not reach here'));
        })
            .catch((err) => {
            assert(err);
            done();
        });
    });
    it('should handle requests in parallel', () => {
        return Promise.all([
            downloadZip.run(TESTURLS),
            downloadZip.run(TESTURLS),
            downloadZip.run(TESTURLS),
            downloadZip.run(TESTURLS),
            downloadZip.run(TESTURLS),
        ]);
    });
    it('should download a jpg or png file', (done) => {
        async.waterfall([
            (next) => {
                downloadZip.run(TESTURLS)
                    .then((path) => {
                    next(undefined, path);
                })
                    .catch(next);
            },
            (zipfile, next) => {
                tmp.dir({ keep: true }, (err, path) => {
                    next(err, path, zipfile);
                });
            },
            (unzipTarget, zipFile, next) => {
                const unzippedFiles = [];
                fs.createReadStream(zipFile)
                    .pipe(unzip.Parse())
                    .on('entry', (entry) => {
                    const target = unzipTarget + '/' + entry.path;
                    unzippedFiles.push(target);
                    entry.pipe(fs.createWriteStream(target));
                })
                    .on('close', (err) => {
                    next(err, unzippedFiles);
                });
            },
            (unzippedFiles, next) => {
                async.map(unzippedFiles, (unzippedFile, nextFile) => {
                    fs.stat(unzippedFile, (err, stats) => {
                        if (err) {
                            return nextFile(err);
                        }
                        nextFile(err, {
                            location: unzippedFile,
                            size: stats.size,
                        });
                    });
                }, next);
            },
            (unzippedFilesInfo, next) => {
                assert.strictEqual(unzippedFilesInfo.length, 3);
                async.each(unzippedFilesInfo, (unzippedFile, nextFile) => {
                    switch (unzippedFile.size) {
                        case 22955:
                            filecompare('./src/tests/utils/resources/map.jpg', unzippedFile.location, (isEq) => {
                                assert(isEq, './src/tests/utils/resources/map.jpg');
                                nextFile();
                            });
                            break;
                        case 7519:
                            filecompare('./src/tests/utils/resources/watson.jpg', unzippedFile.location, (isEq) => {
                                assert(isEq, './src/tests/utils/resources/watson.jpg');
                                nextFile();
                            });
                            break;
                        case 15039:
                            filecompare('./src/tests/utils/resources/ibm.png', unzippedFile.location, (isEq) => {
                                assert(isEq, './src/tests/utils/resources/ibm.png');
                                nextFile();
                            });
                            break;
                        default:
                            assert.fail(0, 1, 'Unexpected file size ' + unzippedFile.size + ' ' +
                                unzippedFile.location);
                            break;
                    }
                }, next);
            },
        ], done);
    });
});
const TESTURLS = [
    {
        type: 'download',
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/IBM_logo.svg/320px-IBM_logo.svg.png',
        imageid: '1',
    },
    {
        type: 'download',
        // tslint:disable-next-line:max-line-length
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Thomas_J_Watson_Sr.jpg/148px-Thomas_J_Watson_Sr.jpg',
        imageid: '2',
    },
    {
        type: 'download',
        // tslint:disable-next-line:max-line-length
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Old_Map_Hursley_1607.jpg/218px-Old_Map_Hursley_1607.jpg?download',
        imageid: '3',
    },
];
const INVALIDURLS = [
    {
        type: 'download',
        url: 'https://www.w3.org/Graphics/SVG/svglogo.svg',
        imageid: '4',
    },
];
