"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*eslint-env mocha */
const assert = require("assert");
const fs = require("fs");
const async = require("async");
const tmp = require("tmp");
const unzip = require("unzipper");
const filecompare = require("filecompare");
const objectstore = require("../../lib/objectstore");
const downloadAndZip = require("../../lib/utils/downloadAndZip");
describe.skip('Request image training zip from OpenWhisk', () => {
    before(() => {
        objectstore.init();
    });
    describe('Zip', () => {
        it('should create a zip of downloaded and retrieved images', (done) => {
            const wm = 'https://upload.wikimedia.org/wikipedia/commons/';
            const locations = [
                { type: 'download', imageid: '1',
                    url: wm + 'thumb/5/51/IBM_logo.svg/320px-IBM_logo.svg.png' },
                { type: 'download', imageid: '2',
                    url: wm + '5/59/IBM_Rochester_X.png?download' },
                { type: 'retrieve', spec: {
                        classid: 'banana',
                        userid: 'auth0|5b296bce04e0e30bf72a6f0c',
                        projectid: 'f905f940-a4cd-11e9-b9e1-c157290d5ed7',
                        imageid: 'db680cbe-f45d-4813-b94e-aa6c49b2d529',
                    } },
                { type: 'download', imageid: '3',
                    url: wm + 'thumb/7/7e/Thomas_J_Watson_Sr.jpg/148px-Thomas_J_Watson_Sr.jpg' },
                { type: 'download', imageid: '4',
                    url: wm + 'b/b3/Trees_and_clouds_with_a_hole%2C_Karawanks%2C_Slovenia.jpg?download' },
                { type: 'download', imageid: '5',
                    url: wm + 'c/c5/Noctilucent-clouds-msu-6817.jpg?download' },
                { type: 'retrieve', spec: {
                        classid: 'banana',
                        userid: 'auth0|5b296bce04e0e30bf72a6f0c',
                        projectid: 'ea7409e0-a59a-11e8-9360-b17a0413da8c',
                        imageid: '2ce72fe7-3675-44b2-91fb-266bdb3c187c',
                    } },
                { type: 'download', imageid: '6',
                    url: wm + 'd/df/IBMThinkpad760ED.gif?download' },
            ];
            async.waterfall([
                (next) => {
                    // @ts-ignore
                    downloadAndZip.runInServerless(locations)
                        .then((zip) => {
                        next(undefined, zip);
                    })
                        .catch((err) => {
                        next(err);
                    });
                },
                (zipfile, next) => {
                    tmp.dir((err, dir) => {
                        next(err, dir, zipfile);
                    });
                },
                (unzipTarget, zipFile, next) => {
                    const unzippedFiles = [];
                    fs.createReadStream(zipFile)
                        // @ts-ignore
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
                    assert.strictEqual(unzippedFilesInfo.length, 8);
                    async.each(unzippedFilesInfo, (unzippedFile, nextFile) => {
                        switch (unzippedFile.size) {
                            case 9189:
                                filecompare('./serverless-functions/test/resources/small-ibm.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-ibm.png');
                                    nextFile();
                                });
                                break;
                            case 112382:
                                filecompare('./serverless-functions/test/resources/small-rochester.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-rochester.png');
                                    nextFile();
                                });
                                break;
                            case 23966:
                                filecompare('./serverless-functions/test/resources/small-watson.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-watson.png');
                                    nextFile();
                                });
                                break;
                            case 119566:
                                filecompare('./serverless-functions/test/resources/small-cloud-2.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-cloud.png');
                                    nextFile();
                                });
                                break;
                            case 113290:
                                filecompare('./serverless-functions/test/resources/small-sea-2.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-sea.png');
                                    nextFile();
                                });
                                break;
                            case 75147:
                                filecompare('./serverless-functions/test/resources/small-thinkpad.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-thinkpad.png');
                                    nextFile();
                                });
                                break;
                            case 10810:
                                filecompare('./serverless-functions/test/resources/small-dog.png', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/small-dog.png');
                                    nextFile();
                                });
                                break;
                            case 13631:
                                filecompare('./serverless-functions/test/resources/test-circle.jpeg', unzippedFile.location, (isEq) => {
                                    assert(isEq, './test/resources/test-circle.jpeg');
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
        it('should handle failures to download images', () => {
            const wm = 'https://upload.wikimedia.org/wikipedia/commons/';
            const locations = [
                { type: 'download', imageid: '1',
                    url: wm + 'thumb/5/51/IBM_logo.svg/320px-IBM_logo.svg.png' },
                { type: 'download', imageid: '2',
                    url: wm + '5/59/IBM_Rochester_X.png?download' },
                { type: 'download', imageid: '3',
                    url: wm + 'thumb/7/7e/Thomas_J_Watson_Sr.jpg/148px-Thomas_J_Watson_Sr.jpg' },
                { type: 'download', imageid: 'XXX',
                    url: wm + 'THIS-DOES-NOT-ACTUALLY-EXIST' },
                { type: 'download', imageid: '4',
                    url: wm + 'b/b3/Trees_and_clouds_with_a_hole%2C_Karawanks%2C_Slovenia.jpg?download' },
                { type: 'download', imageid: '5',
                    url: wm + 'c/c5/Noctilucent-clouds-msu-6817.jpg?download' },
                { type: 'download', imageid: '6',
                    url: wm + 'd/df/IBMThinkpad760ED.gif?download' },
            ];
            // @ts-ignore
            return downloadAndZip.runInServerless(locations)
                .then((zip) => {
                assert.fail(zip);
            })
                .catch((err) => {
                assert.strictEqual(err.message, 'Unable to download image from upload.wikimedia.org');
                assert.deepStrictEqual(err.location, locations[3]);
            });
        });
        it('should handle requests to include images from non-existent hosts', () => {
            const locations = [
                { type: 'download', imageid: '1',
                    url: 'http://this-website-does-not-actually-exist.co.uk/image.jpg' },
            ];
            // @ts-ignore
            return downloadAndZip.runInServerless(locations)
                .then((zip) => {
                assert.fail(zip);
            })
                .catch((err) => {
                assert.strictEqual(err.message, 'Unable to download image from this-website-does-not-actually-exist.co.uk');
                assert.deepStrictEqual(err.location, locations[0]);
            });
        });
        it('should handle requests to include unsupported image types', () => {
            const locations = [
                { type: 'download', imageid: '1',
                    url: 'https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg?download' },
            ];
            // @ts-ignore
            return downloadAndZip.runInServerless(locations)
                .then((zip) => {
                assert.fail(zip);
            })
                .catch((err) => {
                assert.strictEqual(err.message, 'Unsupported image file type');
                assert.deepStrictEqual(err.location, locations[0]);
            });
        });
    });
});
