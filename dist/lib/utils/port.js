"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getPortNumber(portnum, defaultport) {
    if (portnum) {
        const port = parseInt(portnum, 10);
        if (isNaN(port)) {
            return defaultport;
        }
        return port;
    }
    return defaultport;
}
exports.default = getPortNumber;
