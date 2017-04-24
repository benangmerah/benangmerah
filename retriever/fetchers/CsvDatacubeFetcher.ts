import * as url from 'url';
import httpFetch from 'node-fetch';
import csvParser = require('csv-parser');
import * as isNumeric from 'isnumeric';
import * as _s from 'underscore.string';

import ns from '../lib/Namespaces';
import { Hasher } from '../lib/Hasher';
import { BaseFetcher } from '../lib/BaseFetcher';

const yearRegex = /^[0-9]{4}$/;
const yearMonthRegex = /^[0-9]{4}-[0-9]{2}$/;
const abbreviationRegex =
  /^([aeiou]?[bcdfghjklmnpqrstvwxyz\-]{2,}|[a-z\-]{1,3})$/i;

interface CsvDatacubeFetcherParams {
  csvUrl: string;
  datasetIri?: string;

  // Fields to process; exclude other fields
  activeFields?: string[];
  excludeFields?: string[];
  fieldToIri?: {
    [prop: string]: string;
  }
  fieldTypes?: {
    [prop: string]: string
  }

  heuristicsFieldTypes: boolean;
  useHashForObservationIri: boolean;

  // Hashing fields
}

export interface CsvRow {
  [prop: string]: string;
}

export class ObservationMap extends Map<string, string> {
  hasher: Hasher;

  constructor(iterator?: any, options: {
    hashingSeed?: number;
    hashingRadix?: number;
  } = {}) {
    super(iterator);

    this.hasher = new Hasher({
      seed: options.hashingSeed,
      radix: options.hashingRadix
    });
  }

  hashString(unhashed: string): string {
    return this.hasher.getHashString(unhashed);
  }

  getHash(): string {
    let tupleStrings: string[] = [];

    for (const [predicate, object] of this) {
      const objectPart = object[0] === '"' ? object : `<${object}>`;
      tupleStrings.push(`<${predicate}> ${objectPart}`);
    }

    let sortedTupleStrings = tupleStrings.sort();

    let joinedSortedTupleString = sortedTupleStrings.join(', ');

    return this.hashString(joinedSortedTupleString);
  }
}

export default class CsvDatacubeFetcher extends BaseFetcher {
  fetcherParams: CsvDatacubeFetcherParams;
  isFirstRowProcessed: boolean = false;
  availableFields: string[] = [];
  activeFields: string[] = [];

  init(): void {
    // Set default params so that we don't break types
    this.fetcherParams = {
      datasetIri: this.fetcherParams.csvUrl,
      activeFields: [],
      excludeFields: [],
      fieldToIri: {},
      fieldTypes: {},
      heuristicsFieldTypes: true,
      useHashForObservationIri: true,
      ...this.fetcherParams
    };
  }

  // Process the header row and determine fields to process
  processHeader(headerList: string[]): void {
    let availableFields = this.availableFields = headerList;

    // If fetcherParams.activeFields is present, then we only use those fields.
    // Else, use all fields defined in header
    let activeFields: string[];
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
  processFirstRow(rowObject: CsvRow): void {
    if (this.fetcherParams.heuristicsFieldTypes) {
      for (const fieldName of this.activeFields) {
        if (this.fetcherParams.fieldTypes[fieldName]) {
          continue;
        }

        const value = rowObject[fieldName];
        if (isNumeric(value)) {
          this.fetcherParams.fieldTypes[fieldName] = ns.xsd + 'decimal';
        }
      }
    }

    this.generateDsd(rowObject);

    // TODO implement generateDsd
  }

  generateDsd(rowObject: CsvRow): void {
    let dimensionFields: string[] = [];
    let measureFields: string[] = [];
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

    this.addTriple(this.fetcherParams.datasetIri, `${ns.qb}structure`, dsdIri);
    this.addTriple(dsdIri, `${ns.rdf}type`, `${ns.qb}DataStructureDefinition`);

    let order = 0;
    const addComponent = (fieldName: string, propName: string, fieldNS: string, declareTypeAndLabel: boolean = true) => {
      let fieldIri = url.resolve(fieldNS, fieldName);

      if (declareTypeAndLabel) {
        // define rdf:type to the class
        let className = propName === 'dimension' ? 'DimensionProperty' : 'MeasureProperty';
        this.addTriple(fieldIri, `${ns.rdf}type`, ns.qb + className);

        // make up an rdfs:label
        let humanTitleWords: string[] = _s.humanize(fieldName).split(' ');
        humanTitleWords = humanTitleWords.map(word => {
          const isAbbreviation = abbreviationRegex.test(word);
          return isAbbreviation ? word.toUpperCase() : _s.titleize(word);
        });
        let humanTitle = humanTitleWords.join(' ');
        this.addTriple(fieldIri, `${ns.rdfs}label`, `"${humanTitle}"`);
      }

      this.addTriple(dsdIri, `${ns.qb}component`, `${dsdIri}/${fieldName}`);
      this.addTriple(`${dsdIri}/${fieldName}`, ns.qb + propName, fieldIri);
      this.addTriple(`${dsdIri}/${fieldName}`, `${ns.qb}order`, `"${order}"`);
      ++order;
    }

    if (rowObject.kode_provinsi || rowObject.kode_kabkota) {
      addComponent('refArea', 'dimension', ns.bm, false);
    }
    if (rowObject.tahun) {
      addComponent('refPeriod', 'dimension', ns.bm, false);
    }

    for (const fieldName of dimensionFields) {
      addComponent(fieldName, 'dimension', this.fetcherParams.datasetIri);
    }
    for (const fieldName of measureFields) {
      addComponent(fieldName, 'measure', this.fetcherParams.datasetIri);
    }
  }

  // To add heuristics, extend this class and override this method
  preProcessRow(rowObject: CsvRow, observationMap: ObservationMap): CsvRow {
    return rowObject;
  }

  processRow(rowObject: CsvRow, idx: number): void {
    const observationMap: ObservationMap = new ObservationMap();

    observationMap.set(ns.rdf + 'type', ns.qb + 'Observation');
    observationMap.set(ns.qb + 'dataSet', this.fetcherParams.datasetIri);

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
    let observationIdentifier = ''
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

  getFieldIri(fieldName: string): string {
    if (this.fetcherParams.fieldToIri[fieldName]) {
      return this.fetcherParams.fieldToIri[fieldName];
    }

    return url.resolve(this.fetcherParams.datasetIri, `#${fieldName}`);
  }

  getObjectN3(fieldName: string, objectRawValue: string): string {
    let n3string = `"${objectRawValue}"`;
    const fieldType = this.fetcherParams.fieldTypes[fieldName];
    if (fieldType) {
      n3string += `^^<${fieldType}>`;
    }

    return n3string;
  }

  async fetch(): Promise<void> {
    let csvUrl = this.fetcherParams.csvUrl;
    if (!csvUrl) {
      throw new Error('CsvDatacubeFetcher: csvUrl not specified.');
    }

    let response = await httpFetch(csvUrl);
    if (response.status !== 200) {
      throw new Error(`CsvDatacubeFetcher: ${response.status} ${response.statusText} when fetching ${csvUrl}`)
    }

    let rowNumber = 0;

    let responseStream = response.body;
    let csvStream = csvParser();

    csvStream.on('headers', (headerList: string[]) => {
      this.processHeader(headerList);
    });

    csvStream.on('data', (rowObject: CsvRow) => {
      if (rowNumber === 0) {
        this.processFirstRow(rowObject);
      }
      this.processRow(rowObject, rowNumber);
      ++rowNumber;
    });

    responseStream.pipe(csvStream);

    return new Promise<void>((resolve, reject) => {
      csvStream.on('end', () => resolve());
      csvStream.on('error', (e: Error) => reject(e));
    });
  }
}