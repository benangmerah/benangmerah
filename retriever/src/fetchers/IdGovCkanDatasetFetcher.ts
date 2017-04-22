import httpFetch from 'node-fetch';
import { Response } from 'node-fetch';
import * as queryString from 'querystring';
import * as _s from 'underscore.string';

import { BaseFetcher } from '../lib/BaseFetcher';
import ns from '../lib/Namespaces';

class CkanApiClient {
  ckanUrl: string;

  constructor(ckanUrl: string) {
    this.ckanUrl = ckanUrl.replace(/\/+$/, '');
  }

  getEndpointUrl(action: string, params: object): string {
    const endpointUrl = this.ckanUrl + '/api/3/action/' + action;
    if (params) {
      const qs = queryString.stringify(params);
      return `${endpointUrl}?${qs}`;
    }

    return endpointUrl;
  }

  async action(action: string, params: object): Promise<any> {
    const endpointUrl = this.getEndpointUrl(action, params);
    let request = await httpFetch(this.getEndpointUrl(action, params));
    if (request.status !== 200) {
      throw new Error(`${request.status} ${request.statusText}: ${endpointUrl}`);
    }

    let jsonObject = await request.json();
    if (!jsonObject) {
      throw new Error(`Invalid JSON: ${endpointUrl}`);
    }

    if (!jsonObject.success) {
      throw new Error(`CKAN error: ${jsonObject.error.message}`);
    }

    return jsonObject;
  }
}

// Fetch data from a dataset hosted on Data.go.id
export default class IdGovCkanDatasetFetcher extends BaseFetcher {
  datasetIri: string;

  init() {
    this.fetcherParams = {
      ckanUrl: 'http://data.go.id/',
      ...this.fetcherParams
    };

    this.datasetIri = this.fetcherParams.ckanUrl + 'dataset/' + this.fetcherParams.datasetId;
  }

  async fetchCkanMetadata(): Promise<any> {
    this.info('Fetching from CKAN...');

    var client = new CkanApiClient(this.fetcherParams.ckanUrl);

    let responseObject = await client.action('package_show', { id: this.fetcherParams.datasetId });

    if (!responseObject.result) {
      throw new Error('Invalid response from CKAN');
    }

    return responseObject.result;
  }

  addMetadataTriples(meta: any): void {
    this.info('Generating dataset metadata...');

    var datasetUri = this.datasetIri;

    this.addTriple(datasetUri, ns.rdf + 'type', ns.qb + 'DataSet');
    this.addTriple(datasetUri, ns.rdfs + 'label', `"${meta.title}"`);
    this.addTriple(datasetUri, ns.rdfs + 'comment', `"${meta.notes}"`);
    // this.addTriple(datasetUri, ns.qb + 'structure', this.fetcherParams.dsd); // overlap

    // Dates
    this.addTriple(datasetUri, ns.dct + 'modified', `"${meta.metadata_modified}"`);

    // License
    if (meta.license_url) {
      this.addTriple(datasetUri, ns.dct + 'license', meta.license_url);
    }
    if (meta.license_title) {
      this.addTriple(meta.license_url, ns.rdfs + 'label', `"${meta.license_title}"`);
    }

    // Publishing organization
    if (meta.organization) {
      const org = meta.organization;
      const orgBaseIri = this.fetcherParams.ckanUrl + 'organization/';
      const orgIri = orgBaseIri + org.name;

      this.addTriple(datasetUri, ns.dct + 'publisher', orgIri);
      this.addTriple(orgIri, ns.rdf + 'type', ns.org + 'Organization');
      this.addTriple(orgIri, ns.rdfs + 'label', `"${org.title}"`);
      this.addTriple(orgIri, ns.rdfs + 'comment', `"${org.description}"`);
    }

    // Groups
    if (meta.groups) {
      const groupBaseIri = this.fetcherParams.ckanUrl + 'group/';
      meta.groups.forEach((group: any) => {
        const groupUri = groupBaseIri + group.name;
        this.addTriple(datasetUri, ns.dct + 'subject', groupUri);
        this.addTriple(groupUri, ns.rdf + 'type', ns.bm + 'Topic');
        this.addTriple(groupUri, ns.rdfs + 'label',
          `"${group.title}"`);
        this.addTriple(groupUri, ns.rdfs + 'comment',
          `"${group.description}"`);
      });
    }

    // Tags
    if (meta.tags) {
      var tagBaseIri = this.fetcherParams.ckanUrl + 'dataset?tags=';
      meta.tags.forEach((tag: any) => {
        const tagUri = tagBaseIri + encodeURIComponent(tag.name);
        this.addTriple(datasetUri, ns.dct + 'subject', tagUri);
        this.addTriple(tagUri, ns.rdf + 'type', ns.bm + 'Tag');
        this.addTriple(tagUri, ns.rdfs + 'label', `"${tag.display_name}"`);
      });
    }

    // Extras
    if (meta.extras) {
      var extraBaseIri = this.fetcherParams.ckanUrl + '#meta-';
      meta.extras.forEach((extra: any) => {
        var extraUri = extraBaseIri + _s.dasherize(extra.key.toLowerCase());
        this.addTriple(datasetUri, extraUri, `"${extra.value}"`);
        this.addTriple(extraUri, ns.rdfs + 'label', `"${extra.key}"`);

        if (extra.key === 'Rujukan' && _s.startsWith(extra.value, 'http')) {
          this.addTriple(datasetUri, ns.rdfs + 'seeAlso', extra.value);
        }
      });
    }
  }

  async fetch(): Promise<void> {
    if (!this.fetcherParams.datasetId) {
      this.error('No dataset was specified.');
      return;
    }

    let datasetMetadata = await this.fetchCkanMetadata();

    let csvUrl;
    for (const resource of datasetMetadata.resources) {
      if (_s.endsWith(resource.url, '.csv')) {
        csvUrl = resource.url;
        break;
      }
    }

    if (csvUrl) {
      this.addMetadataTriples(datasetMetadata);
      let csvFetcher = this.addDependentFetcher({
        name: 'csv',
        fetcherClassName: 'DataGoIdCsvDatacubeFetcher',
        fetcherParams: {
          csvUrl: csvUrl,
          datasetIri: this.datasetIri
        }
      });
      await csvFetcher.fetch();
    }
  }
}