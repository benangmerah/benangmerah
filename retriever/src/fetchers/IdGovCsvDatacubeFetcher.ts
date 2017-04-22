import CsvDatacubeFetcher from './CsvDatacubeFetcher';
import {CsvRow, ObservationMap} from './CsvDatacubeFetcher';
import * as _s from 'underscore.string';

import ns from '../lib/Namespaces';

const yearRegex = /^[0-9]{4}$/;
const yearMonthRegex = /^[0-9]{4}-[0-9]{2}$/;
const abbreviationRegex = /^([aeiou]?[bcdfghjklmnpqrstvwxyz\-]{2,}|[a-z\-]{1,3})$/i;

// Like CsvDatacubeFetcher but with additional heuristics for Data.go.id datasets
export default class IdGovCsvDatacubeFetcher extends CsvDatacubeFetcher {
  heuristicFields: string[];

  init() {
    super.init();

    this.heuristicFields = [
      'kode_provinsi', 'nama_provinsi', 'kode_kabkota', 'koordinat_provinsi',
      'koordinat_kabkota', 'nama_kabkota', 'tahun', 'bulan', '', 'orderer', 'latitude', 'longitude'
    ];

    // exclude heuristicFields
    this.fetcherParams.excludeFields = this.heuristicFields;
  }

  preProcessRow(rowObject: CsvRow, observationMap: ObservationMap): CsvRow {
    const processedRow = {...rowObject};

    this.heuristicFields.forEach(ignoredField => {
      delete processedRow[ignoredField];
    });

    // Handle refArea
    if (rowObject.kode_kabkota) {
      observationMap.set(ns.bm + 'refArea', ns.bps + rowObject.kode_kabkota);
    }
    else if (rowObject.kode_provinsi) {
      observationMap.set(ns.bm + 'refArea', ns.bps + rowObject.kode_provinsi);
    }

    // Handle refPeriod
    if (rowObject.tahun && rowObject.bulan) {
      var period = rowObject.tahun + '-' + _s.pad(rowObject.bulan, 2, '0');
      observationMap.set(ns.bm + 'refPeriod', `"${period}"^^<${ns.xsd}gYearMonth>`);
    }
    else if (rowObject.tahun) {
      if (yearRegex.test(rowObject.tahun)) {
        observationMap.set(ns.bm + 'refPeriod', `"${rowObject.tahun}"^^<${ns.xsd}gYear>`);
      }
      else {
        observationMap.set(ns.bm + 'refPeriod', `"${rowObject.tahun}"`);
      }
    }

    return processedRow;
  }
}