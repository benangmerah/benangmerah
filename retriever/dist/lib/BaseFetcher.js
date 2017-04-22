"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = require("eventemitter3");
class BaseFetcher extends eventemitter3_1.EventEmitter {
    constructor(definition, internalOptions = {}) {
        super();
        this.dependentFetchers = new Map();
        this.definition = definition;
        this.name = definition.name;
        this.fetcherParams = definition.fetcherParams;
        if (internalOptions.parentFetcher) {
            this.parentFetcher = internalOptions.parentFetcher;
            this.absoluteName = internalOptions.parentFetcher.name + '/' + this.name;
        }
        else {
            this.absoluteName = this.name;
        }
        this.fetcherMap = internalOptions.fetcherMap;
        this.init();
    }
    // Initialize the fetcher on downlevel classes
    init() {
    }
    addTriple(subject, predicate, object) {
        const eventObject = {
            subject,
            predicate,
            object,
            dataSourceAbsoluteName: this.absoluteName,
            fetcherObject: this
        };
        if (this.parentFetcher) {
            this.parentFetcher.emit('triple', eventObject);
        }
        else {
            this.emit('triple', eventObject);
        }
    }
    addDependentFetcher(definition) {
        if (!this.fetcherMap) {
            throw new Error(`Cannot add dependent fetcher ${definition.name} as fetcherMap is not defined.`);
        }
        const ctor = this.fetcherMap.get(definition.fetcherClassName);
        if (!ctor) {
            throw new Error(``);
        }
        const fetcherObj = new ctor(definition, {
            fetcherMap: this.fetcherMap,
            parentFetcher: this
        });
        this.dependentFetchers.set(definition.name, fetcherObj);
        return fetcherObj;
    }
    log(level, message) {
        this.emit('log', { level, message });
    }
    info(message) {
        this.log('info', message);
    }
    error(message) {
        this.log('error', message);
    }
}
exports.BaseFetcher = BaseFetcher;
