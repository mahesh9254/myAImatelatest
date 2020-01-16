"use strict";
/* eslint-disable no-unused-vars */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_LABEL_LENGTH = 30;
var PendingJobType;
(function (PendingJobType) {
    PendingJobType[PendingJobType["DeleteOneObjectFromObjectStorage"] = 1] = "DeleteOneObjectFromObjectStorage";
    PendingJobType[PendingJobType["DeleteProjectObjectsFromObjectStorage"] = 2] = "DeleteProjectObjectsFromObjectStorage";
    PendingJobType[PendingJobType["DeleteUserObjectsFromObjectStorage"] = 3] = "DeleteUserObjectsFromObjectStorage";
    PendingJobType[PendingJobType["DeleteClassObjectsFromObjectStorage"] = 4] = "DeleteClassObjectsFromObjectStorage";
})(PendingJobType = exports.PendingJobType || (exports.PendingJobType = {}));
