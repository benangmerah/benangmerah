"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const XXH = require("xxhashjs");
class Hasher {
    constructor(options) {
        this.radix = 32;
        if (options.seed !== undefined) {
            this.seed = options.seed;
        }
        else {
            this.seed = 8;
        }
        if (options.radix !== undefined) {
            this.radix = options.radix;
        }
        else {
            this.radix = 36;
        }
    }
    get seed() {
        return this._seed;
    }
    set seed(v) {
        this._seed = v;
        this.hasherObject = new XXH.h32(this._seed);
    }
    getHashString(unhashed) {
        return this.hasherObject.update(unhashed).digest().toString(this.radix);
    }
}
exports.Hasher = Hasher;
