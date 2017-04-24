// When implementing new fetchers, make sure to add to fetcherMap

import { FetcherConstructor } from '../lib/BaseFetcher';
import CsvDatacubeFetcher from './CsvDatacubeFetcher';
import IdGovCsvDatacubeFetcher from './IdGovCsvDatacubeFetcher';
import IdGovCkanDatasetFetcher from './IdGovCkanDatasetFetcher';

const fetcherMap = new Map<string, FetcherConstructor>();
fetcherMap.set('CsvDatacubeFetcher', CsvDatacubeFetcher);
fetcherMap.set('IdGovCsvDatacubeFetcher', IdGovCsvDatacubeFetcher);
fetcherMap.set('IdGovCkanDatasetFetcher', IdGovCkanDatasetFetcher);

export { fetcherMap };