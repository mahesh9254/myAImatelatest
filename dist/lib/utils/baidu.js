"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// core dependencies
const url = require("url");
// local dependencies
const logger_1 = require("./logger");
const log = logger_1.default();
function isBaiduImageSearchResult(imageurl) {
    return !!imageurl &&
        imageurl.startsWith('https://timgsa.baidu.com/timg');
}
exports.isBaiduImageSearchResult = isBaiduImageSearchResult;
// tslint:disable:max-line-length
/**
 * Returns the source URL of a baidu image search result.
 *
 * @param imageurl
 * (e.g. https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1572187064800&di=de34974dd95b70edba4c94dabdaf7c68&imgtype=0&src=http%3A%2F%2Fimg.jk51.com%2Fimg_jk51%2F151359276.jpeg )
 */
function getSource(imageurl) {
    const imageAddress = new url.URL(imageurl);
    if (imageAddress &&
        imageAddress.searchParams &&
        imageAddress.searchParams.has('src')) {
        const src = imageAddress.searchParams.get('src');
        if (src) {
            return src;
        }
    }
    log.warn({ imageurl }, 'Unable to find src attribute from baidu search URL');
    return imageurl;
}
exports.getSource = getSource;
