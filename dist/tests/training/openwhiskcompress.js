"use strict";
/*eslint-env mocha */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const fs = require("fs");
const tmp = require("tmp");
const numbers = require("../../lib/training/numbers");
describe('Compression for OpenWhisk calls', () => {
    it('should compress training data with multi-choice fields', () => {
        const trainingdatastr = fs.readFileSync('./src/tests/training/resources/tictactoe.json', 'utf-8');
        const trainingdata = JSON.parse(trainingdatastr);
        const compressed = numbers.compress(trainingdata);
        const target = tmp.fileSync();
        fs.writeFileSync(target.name, JSON.stringify(compressed));
        const decompresseddata = fs.readFileSync(target.name, 'utf-8');
        const decompressed = JSON.parse(decompresseddata);
        const roundtrip = numbers.decompress(decompressed);
        assert.deepStrictEqual(trainingdata, roundtrip);
    });
    it('should compress training data with numeric fields', () => {
        const trainingdatastr = fs.readFileSync('./src/tests/training/resources/bigorsmall.json', 'utf-8');
        const trainingdata = JSON.parse(trainingdatastr);
        const compressed = numbers.compress(trainingdata);
        const target = tmp.fileSync();
        fs.writeFileSync(target.name, JSON.stringify(compressed));
        const decompresseddata = fs.readFileSync(target.name, 'utf-8');
        const decompressed = JSON.parse(decompresseddata);
        const roundtrip = numbers.decompress(decompressed);
        assert.deepStrictEqual(trainingdata, roundtrip);
    });
});
