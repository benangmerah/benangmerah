"use strict";
// When implementing new fetchers, make sure to add to fetcherMap
Object.defineProperty(exports, "__esModule", { value: true });
const CsvDatacubeFetcher_1 = require("./CsvDatacubeFetcher");
const IdGovCsvDatacubeFetcher_1 = require("./IdGovCsvDatacubeFetcher");
const IdGovCkanDatasetFetcher_1 = require("./IdGovCkanDatasetFetcher");
const fetcherMap = new Map();
exports.fetcherMap = fetcherMap;
fetcherMap.set('CsvDatacubeFetcher', CsvDatacubeFetcher_1.default);
fetcherMap.set('IdGovCsvDatacubeFetcher', IdGovCsvDatacubeFetcher_1.default);
fetcherMap.set('IdGovCkanDatasetFetcher', IdGovCkanDatasetFetcher_1.default);
