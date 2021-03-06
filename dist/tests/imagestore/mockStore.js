"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const randomstring = require("randomstring");
const assert = require("assert");
const uuid = require("uuid/v4");
let bucketStructured = {};
let bucketFlat = {};
let etags = {};
function store(obj) {
    bucketFlat[obj.Key] = obj;
    const keyChunks = obj.Key.split('/');
    assert.strictEqual(keyChunks.length, 4);
    const classid = keyChunks[0];
    const userid = keyChunks[1];
    const projectid = keyChunks[2];
    const imageid = keyChunks[3];
    if (classid in bucketStructured === false) {
        bucketStructured[classid] = {};
    }
    if (userid in bucketStructured[classid] === false) {
        bucketStructured[classid][userid] = {};
    }
    if (projectid in bucketStructured[classid][userid] === false) {
        bucketStructured[classid][userid][projectid] = {};
    }
    bucketStructured[classid][userid][projectid][imageid] = obj;
}
function del(key) {
    const keyChunks = key.split('/');
    assert.strictEqual(keyChunks.length, 4);
    const classid = keyChunks[0];
    const userid = keyChunks[1];
    const projectid = keyChunks[2];
    const imageid = keyChunks[3];
    delete bucketFlat[key];
    if (bucketStructured[classid] &&
        bucketStructured[classid][userid] &&
        bucketStructured[classid][userid][projectid]) {
        delete bucketStructured[classid][userid][projectid][imageid];
    }
    if (bucketStructured[classid] &&
        bucketStructured[classid][userid] &&
        bucketStructured[classid][userid][projectid] &&
        Object.keys(bucketStructured[classid][userid][projectid]).length === 0) {
        delete bucketStructured[classid][userid][projectid];
    }
    if (bucketStructured[classid] &&
        bucketStructured[classid][userid] &&
        Object.keys(bucketStructured[classid][userid]).length === 0) {
        delete bucketStructured[classid][userid];
    }
    if (bucketStructured[classid] &&
        Object.keys(bucketStructured[classid]).length === 0) {
        delete bucketStructured[classid];
    }
}
// function getFromStruct(
//     classid: string,
//     userid: string,
//     projectid: string,
//     imageid: string,
// ): IBMCosSDK.S3.PutObjectRequest
// {
//     return bucketStructured[classid][userid][projectid][imageid];
// }
// function getFromFlat(
//     classid: string,
//     userid: string,
//     projectid: string,
//     imageid: string,
// ): IBMCosSDK.S3.PutObjectRequest
// {
//     return bucketFlat[[classid, userid, projectid, imageid].join('/')];
// }
function listUsers(classid) {
    let CommonPrefixes;
    if (bucketStructured[classid]) {
        CommonPrefixes = Object.keys(bucketStructured[classid])
            .map((userid) => {
            return { Prefix: classid + '/' + userid + '/' };
        });
    }
    return {
        IsTruncated: false,
        Marker: '',
        Contents: [],
        Name: 'BUCKETID',
        Prefix: classid + '/',
        Delimiter: '/',
        MaxKeys: 1000,
        CommonPrefixes,
    };
}
function listProjects(classid, userid) {
    let CommonPrefixes;
    if (bucketStructured[classid] && bucketStructured[classid][userid]) {
        CommonPrefixes = Object.keys(bucketStructured[classid][userid])
            .map((imageid) => {
            return { Prefix: classid + '/' + userid + '/' + imageid + '/' };
        });
    }
    return {
        IsTruncated: false,
        Marker: '',
        Contents: [],
        Name: 'BUCKETID',
        Prefix: classid + '/' + userid + '/',
        Delimiter: '/',
        MaxKeys: 1000,
        CommonPrefixes,
    };
}
function listImages(classid, userid, projectid) {
    let Contents;
    if (bucketStructured[classid] &&
        bucketStructured[classid][userid] &&
        bucketStructured[classid][userid][projectid]) {
        Contents = Object.keys(bucketStructured[classid][userid][projectid])
            .map((imageid) => {
            return bucketStructured[classid][userid][projectid][imageid];
        })
            .filter((image, idx) => {
            return idx < 3;
        })
            .map((image) => {
            const body = image.Body;
            return {
                Key: image.Key,
                ETag: etags[image.Key],
                Size: body.byteLength,
                StorageClass: 'STANDARD',
            };
        });
    }
    return {
        IsTruncated: false,
        Marker: '',
        Contents,
        Name: 'BUCKETID',
        Prefix: classid + '/' + userid + '/' + projectid + '/',
        Delimiter: '/',
        MaxKeys: 1000,
        CommonPrefixes: [],
    };
}
function reset() {
    bucketStructured = {};
    bucketFlat = {};
    etags = {};
    store({
        Bucket: 'BUCKETID',
        Key: 'INVALIDCLASS/INVALIDUSER/INVALIDPROJECT/MISSINGMETADATA',
        Body: Buffer.from('999'),
    });
    store({
        Bucket: 'BUCKETID',
        Key: 'INVALIDCLASS/INVALIDUSER/INVALIDPROJECT/INVALIDMETADATA',
        Body: Buffer.from('999'),
        Metadata: {},
    });
    store({
        Bucket: 'BUCKETID',
        Key: 'INVALIDCLASS/INVALIDUSER/INVALIDPROJECT/INVALIDIMAGETYPE',
        Body: Buffer.from('999'),
        Metadata: {
            filetype: 'mystery',
        },
    });
}
exports.reset = reset;
function generateETag() {
    return '"' + randomstring.generate({ length: 32 }) + '"';
}
exports.mockS3 = {
    putObject: (def) => {
        store(def);
        const ETag = generateETag();
        etags[def.Key] = ETag;
        return {
            promise: () => {
                return Promise.resolve({ ETag });
            },
        };
    },
    getObject: (def) => {
        return {
            promise: () => {
                if (def.Key in bucketFlat) {
                    const obj = bucketFlat[def.Key];
                    const body = obj.Body;
                    return Promise.resolve({
                        AcceptRanges: 'bytes',
                        LastModified: 'Fri, 22 Dec 2017 21:34:59 GMT',
                        ContentLength: body.byteLength,
                        ETag: etags[def.Key],
                        ContentType: 'application/octet-stream',
                        Metadata: obj.Metadata,
                        Body: body,
                    });
                }
                else {
                    const noSuchKey = new Error('The specified key does not exist.');
                    noSuchKey.code = 'NoSuchKey';
                    noSuchKey.region = null;
                    noSuchKey.time = new Date();
                    noSuchKey.requestId = uuid();
                    noSuchKey.extendedRequestId = undefined;
                    noSuchKey.cfId = undefined;
                    noSuchKey.statusCode = 404;
                    noSuchKey.retryable = false;
                    noSuchKey.retryDelay = 32.288485034471435;
                    return Promise.reject(noSuchKey);
                }
            },
        };
    },
    deleteObject: (def) => {
        del(def.Key);
        delete etags[def.Key];
        return {
            promise: () => {
                return Promise.resolve({});
            },
        };
    },
    listObjects: (def) => {
        return {
            promise: () => {
                if (def.Prefix) {
                    const chunks = def.Prefix.split('/');
                    assert.strictEqual(chunks[chunks.length - 1], '');
                    if (chunks.length === 4) {
                        return Promise.resolve(listImages(chunks[0], chunks[1], chunks[2]));
                    }
                    else if (chunks.length === 3) {
                        return Promise.resolve(listProjects(chunks[0], chunks[1]));
                    }
                    else if (chunks.length === 2) {
                        return Promise.resolve(listUsers(chunks[0]));
                    }
                }
                return Promise.reject(new Error('Missing prefix'));
            },
        };
    },
};
