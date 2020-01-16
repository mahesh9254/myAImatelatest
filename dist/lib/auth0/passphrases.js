"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dictionary_1 = require("../utils/dictionary");
const random_1 = require("../utils/random");
const MIN_ACCEPTABLE_LENGTH = 8;
const MAX_ACCEPTABLE_LENGTH = 18;
const SEPARATORS = ['-', '+', '*', '.', '/', '=', '%', '@'];
function getSeparator() {
    return SEPARATORS[random_1.int(0, SEPARATORS.length - 1)];
}
function numberOfWords() {
    return random_1.int(2, 5);
}
function shuffle() {
    return 0.5 - Math.random();
}
function getShuffledWordsCopy() {
    return [...dictionary_1.WORDS].sort(shuffle);
}
function generate() {
    let passphrase = '';
    while (passphrase.length < MIN_ACCEPTABLE_LENGTH ||
        passphrase.length > MAX_ACCEPTABLE_LENGTH) {
        passphrase = getShuffledWordsCopy()
            .slice(0, numberOfWords())
            .join(getSeparator());
    }
    return passphrase;
}
exports.generate = generate;
