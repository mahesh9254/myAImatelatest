"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getStoreLimits() {
    return {
        textTrainingItemsPerProject: 500,
        numberTrainingItemsPerProject: 1000,
        numberTrainingItemsPerClassProject: 3000,
        imageTrainingItemsPerProject: 100,
        soundTrainingItemsPerProject: 100,
    };
}
exports.getStoreLimits = getStoreLimits;
