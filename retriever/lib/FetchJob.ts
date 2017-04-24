import { BaseFetcher, FetcherConstructor } from './BaseFetcher';
import { fetcherMap } from '../fetchers';

export class FetchJob {
  fetcherMap = fetcherMap;
}