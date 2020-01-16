"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_CACHE = {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Expires': 0,
};
exports.CACHE_10SECONDS = {
    'Cache-Control': 'max-age=10',
};
exports.CACHE_1MINUTE = {
    'Cache-Control': 'max-age=60',
};
exports.CACHE_2MINUTES = {
    'Cache-Control': 'max-age=120',
};
exports.CACHE_1HOUR = {
    'Cache-Control': 'max-age=3600',
};
exports.CACHE_1YEAR = {
    'Cache-Control': 'max-age=31536000',
};
