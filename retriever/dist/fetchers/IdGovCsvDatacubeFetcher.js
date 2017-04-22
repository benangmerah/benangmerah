"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const CsvDatacubeFetcher_1 = require("./CsvDatacubeFetcher");
const _s = require("underscore.string");
const Namespaces_1 = require("../lib/Namespaces");
const yearRegex = /^[0-9]{4}$/;
const yearMonthRegex = /^[0-9]{4}-[0-9]{2}$/;
const abbreviationRegex = /^([aeiou]?[bcdfghjklmnpqrstvwxyz\-]{2,}|[a-z\-]{1,3})$/i;
// Like CsvDatacubeFetcher but with additional heuristics for Data.go.id datasets
class IdGovCsvDatacubeFetcher extends CsvDatacubeFetcher_1.default {
    init() {
        super.init();
        this.heuristicFields = [
            'kode_provinsi', 'nama_provinsi', 'kode_kabkota', 'koordinat_provinsi',
            'koordinat_kabkota', 'nama_kabkota', 'tahun', 'bulan', '', 'orderer', 'latitude', 'longitude'
        ];
        // exclude heuristicFields
        this.fetcherParams.excludeFields = this.heuristicFields;
    }
    preProcessRow(rowObject, observationMap) {
        const processedRow = Object.assign({}, rowObject);
        this.heuristicFields.forEach(ignoredField => {
            delete processedRow[ignoredField];
        });
        // Handle refArea
        if (rowObject.kode_kabkota) {
            observationMap.set(Namespaces_1.default.bm + 'refArea', Namespaces_1.default.bps + rowObject.kode_kabkota);
        }
        else if (rowObject.kode_provinsi) {
            observationMap.set(Namespaces_1.default.bm + 'refArea', Namespaces_1.default.bps + rowObject.kode_provinsi);
        }
        // Handle refPeriod
        if (rowObject.tahun && rowObject.bulan) {
            var period = rowObject.tahun + '-' + _s.pad(rowObject.bulan, 2, '0');
            observationMap.set(Namespaces_1.default.bm + 'refPeriod', `"${period}"^^<${Namespaces_1.default.xsd}gYearMonth>`);
        }
        else if (rowObject.tahun) {
            if (yearRegex.test(rowObject.tahun)) {
                observationMap.set(Namespaces_1.default.bm + 'refPeriod', `"${rowObject.tahun}"^^<${Namespaces_1.default.xsd}gYear>`);
            }
            else {
                observationMap.set(Namespaces_1.default.bm + 'refPeriod', `"${rowObject.tahun}"`);
            }
        }
        return processedRow;
    }
}
exports.default = IdGovCsvDatacubeFetcher;
