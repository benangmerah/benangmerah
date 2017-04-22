"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const url = require("url");
const node_fetch_1 = require("node-fetch");
const csvParser = require("csv-parser");
const isNumeric = require("isnumeric");
const _s = require("underscore.string");
const Namespaces_1 = require("../lib/Namespaces");
const Hasher_1 = require("../lib/Hasher");
const BaseFetcher_1 = require("../lib/BaseFetcher");
const yearRegex = /^[0-9]{4}$/;
const yearMonthRegex = /^[0-9]{4}-[0-9]{2}$/;
const abbreviationRegex = /^([aeiou]?[bcdfghjklmnpqrstvwxyz\-]{2,}|[a-z\-]{1,3})$/i;
class ObservationMap extends Map {
    constructor(iterator, options = {}) {
        super(iterator);
        this.hasher = new Hasher_1.Hasher({
            seed: options.hashingSeed,
            radix: options.hashingRadix
        });
    }
    hashString(unhashed) {
        return this.hasher.getHashString(unhashed);
    }
    getHash() {
        let tupleStrings = [];
        for (const [predicate, object] of this) {
            const objectPart = object[0] === '"' ? object : `<${object}>`;
            tupleStrings.push(`<${predicate}> ${objectPart}`);
        }
        let sortedTupleStrings = tupleStrings.sort();
        let joinedSortedTupleString = sortedTupleStrings.join(', ');
        return this.hashString(joinedSortedTupleString);
    }
}
exports.ObservationMap = ObservationMap;
class CsvDatacubeFetcher extends BaseFetcher_1.BaseFetcher {
    constructor() {
        super(...arguments);
        this.isFirstRowProcessed = false;
        this.availableFields = [];
        this.activeFields = [];
    }
    init() {
        // Set default params so that we don't break types
        this.fetcherParams = Object.assign({ datasetIri: this.fetcherParams.csvUrl, activeFields: [], excludeFields: [], fieldToIri: {}, fieldTypes: {}, heuristicsFieldTypes: true, useHashForObservationIri: true }, this.fetcherParams);
    }
    // Process the header row and determine fields to process
    processHeader(headerList) {
        let availableFields = this.availableFields = headerList;
        // If fetcherParams.activeFields is present, then we only use those fields.
        // Else, use all fields defined in header
        let activeFields;
        const paramActiveFields = this.fetcherParams.activeFields || [];
        if (paramActiveFields.length > 0) {
            activeFields = paramActiveFields;
        }
        else {
            activeFields = availableFields; // obtained by processFirstRow
        }
        const paramExcludeFieldsSet = new Set(this.fetcherParams.excludeFields);
        if (paramExcludeFieldsSet.size > 0) {
            activeFields = activeFields.filter(fieldName => !paramExcludeFieldsSet.has(fieldName));
        }
        this.activeFields = activeFields;
    }
    // Process first row, which is used to determine datatypes for the DSD
    processFirstRow(rowObject) {
        if (this.fetcherParams.heuristicsFieldTypes) {
            for (const fieldName of this.activeFields) {
                if (this.fetcherParams.fieldTypes[fieldName]) {
                    continue;
                }
                const value = rowObject[fieldName];
                if (isNumeric(value)) {
                    this.fetcherParams.fieldTypes[fieldName] = Namespaces_1.default.xsd + 'decimal';
                }
            }
        }
        this.generateDsd(rowObject);
        // TODO implement generateDsd
    }
    generateDsd(rowObject) {
        let dimensionFields = [];
        let measureFields = [];
        for (const fieldName of this.activeFields) {
            const value = rowObject[fieldName];
            if (isNumeric(value)) {
                measureFields.push(fieldName);
            }
            else {
                dimensionFields.push(fieldName);
            }
        }
        let dsdIri = url.resolve(this.fetcherParams.datasetIri, '#_dsd');
        this.addTriple(this.fetcherParams.datasetIri, `${Namespaces_1.default.qb}structure`, dsdIri);
        this.addTriple(dsdIri, `${Namespaces_1.default.rdf}type`, `${Namespaces_1.default.qb}DataStructureDefinition`);
        let order = 0;
        const addComponent = (fieldName, propName, fieldNS, declareTypeAndLabel = true) => {
            let fieldIri = url.resolve(fieldNS, fieldName);
            if (declareTypeAndLabel) {
                // define rdf:type to the class
                let className = propName === 'dimension' ? 'DimensionProperty' : 'MeasureProperty';
                this.addTriple(fieldIri, `${Namespaces_1.default.rdf}type`, Namespaces_1.default.qb + className);
                // make up an rdfs:label
                let humanTitleWords = _s.humanize(fieldName).split(' ');
                humanTitleWords = humanTitleWords.map(word => {
                    const isAbbreviation = abbreviationRegex.test(word);
                    return isAbbreviation ? word.toUpperCase() : _s.titleize(word);
                });
                let humanTitle = humanTitleWords.join(' ');
                this.addTriple(fieldIri, `${Namespaces_1.default.rdfs}label`, `"${humanTitle}"`);
            }
            this.addTriple(dsdIri, `${Namespaces_1.default.qb}component`, `${dsdIri}/${fieldName}`);
            this.addTriple(`${dsdIri}/${fieldName}`, Namespaces_1.default.qb + propName, fieldIri);
            this.addTriple(`${dsdIri}/${fieldName}`, `${Namespaces_1.default.qb}order`, `"${order}"`);
            ++order;
        };
        if (rowObject.kode_provinsi || rowObject.kode_kabkota) {
            addComponent('refArea', 'dimension', Namespaces_1.default.bm, false);
        }
        if (rowObject.tahun) {
            addComponent('refPeriod', 'dimension', Namespaces_1.default.bm, false);
        }
        for (const fieldName of dimensionFields) {
            addComponent(fieldName, 'dimension', this.fetcherParams.datasetIri);
        }
        for (const fieldName of measureFields) {
            addComponent(fieldName, 'measure', this.fetcherParams.datasetIri);
        }
    }
    // To add heuristics, extend this class and override this method
    preProcessRow(rowObject, observationMap) {
        return rowObject;
    }
    processRow(rowObject, idx) {
        const observationMap = new ObservationMap();
        observationMap.set(Namespaces_1.default.rdf + 'type', Namespaces_1.default.qb + 'Observation');
        observationMap.set(Namespaces_1.default.qb + 'dataSet', this.fetcherParams.datasetIri);
        // Heuristics and other things - to be overridden downstream
        rowObject = this.preProcessRow(rowObject, observationMap);
        // activeFields already processed in processHeader
        for (const fieldName of this.activeFields) {
            const fieldIri = this.getFieldIri(fieldName);
            const objectN3 = this.getObjectN3(fieldName, rowObject[fieldName]);
            // TODO: set proper field types
            observationMap.set(fieldIri, objectN3);
        }
        // Get the IRI for the observation
        let observationIdentifier = '';
        if (this.fetcherParams.useHashForObservationIri) {
            observationIdentifier = observationMap.getHash();
        }
        else {
            observationIdentifier = idx.toString();
        }
        const observationIri = url.resolve(this.fetcherParams.datasetIri, '#_' + observationIdentifier);
        // Write the triples
        for (const [predicate, object] of observationMap) {
            this.addTriple(observationIri, predicate, object);
        }
    }
    getFieldIri(fieldName) {
        if (this.fetcherParams.fieldToIri[fieldName]) {
            return this.fetcherParams.fieldToIri[fieldName];
        }
        return url.resolve(this.fetcherParams.datasetIri, `#${fieldName}`);
    }
    getObjectN3(fieldName, objectRawValue) {
        let n3string = `"${objectRawValue}"`;
        const fieldType = this.fetcherParams.fieldTypes[fieldName];
        if (fieldType) {
            n3string += `^^<${fieldType}>`;
        }
        return n3string;
    }
    fetch() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let csvUrl = this.fetcherParams.csvUrl;
            if (!csvUrl) {
                throw new Error('CsvDatacubeFetcher: csvUrl not specified.');
            }
            let response = yield node_fetch_1.default(csvUrl);
            if (response.status !== 200) {
                throw new Error(`CsvDatacubeFetcher: ${response.status} ${response.statusText} when fetching ${csvUrl}`);
            }
            let rowNumber = 0;
            let responseStream = response.body;
            let csvStream = csvParser();
            csvStream.on('headers', (headerList) => {
                this.processHeader(headerList);
            });
            csvStream.on('data', (rowObject) => {
                if (rowNumber === 0) {
                    this.processFirstRow(rowObject);
                }
                this.processRow(rowObject, rowNumber);
                ++rowNumber;
            });
            responseStream.pipe(csvStream);
            return new Promise((resolve, reject) => {
                csvStream.on('end', () => resolve());
                csvStream.on('error', (e) => reject(e));
            });
        });
    }
}
exports.default = CsvDatacubeFetcher;
