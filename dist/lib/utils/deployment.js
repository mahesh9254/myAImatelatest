"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @returns {Boolean} true if the site is a production deployment
 *              running at machinelearningforkids.co.uk
 *                    false if the site is running locally, or a
 *              form deployed to a different location
 */
function isProdDeployment() {
    return process.env &&
        process.env.DEPLOYMENT === 'machinelearningforkids.co.uk';
}
exports.isProdDeployment = isProdDeployment;
