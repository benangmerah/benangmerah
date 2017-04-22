"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_fetch_1 = require("node-fetch");
const queryString = require("querystring");
const _s = require("underscore.string");
const BaseFetcher_1 = require("../lib/BaseFetcher");
const Namespaces_1 = require("../lib/Namespaces");
class CkanApiClient {
    constructor(ckanUrl) {
        this.ckanUrl = ckanUrl.replace(/\/+$/, '');
    }
    getEndpointUrl(action, params) {
        const endpointUrl = this.ckanUrl + '/api/3/action/' + action;
        if (params) {
            const qs = queryString.stringify(params);
            return `${endpointUrl}?${qs}`;
        }
        return endpointUrl;
    }
    action(action, params) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            const endpointUrl = this.getEndpointUrl(action, params);
            let request = yield node_fetch_1.default(this.getEndpointUrl(action, params));
            if (request.status !== 200) {
                throw new Error(`${request.status} ${request.statusText}: ${endpointUrl}`);
            }
            let jsonObject = yield request.json();
            if (!jsonObject) {
                throw new Error(`Invalid JSON: ${endpointUrl}`);
            }
            if (!jsonObject.success) {
                throw new Error(`CKAN error: ${jsonObject.error.message}`);
            }
            return jsonObject;
        });
    }
}
// Fetch data from a dataset hosted on Data.go.id
class IdGovCkanDatasetFetcher extends BaseFetcher_1.BaseFetcher {
    init() {
        this.fetcherParams = Object.assign({ ckanUrl: 'http://data.go.id/' }, this.fetcherParams);
        this.datasetIri = this.fetcherParams.ckanUrl + 'dataset/' + this.fetcherParams.datasetId;
    }
    fetchCkanMetadata() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            this.info('Fetching from CKAN...');
            var client = new CkanApiClient(this.fetcherParams.ckanUrl);
            let responseObject = yield client.action('package_show', { id: this.fetcherParams.datasetId });
            if (!responseObject.result) {
                throw new Error('Invalid response from CKAN');
            }
            return responseObject.result;
        });
    }
    addMetadataTriples(meta) {
        this.info('Generating dataset metadata...');
        var datasetUri = this.datasetIri;
        this.addTriple(datasetUri, Namespaces_1.default.rdf + 'type', Namespaces_1.default.qb + 'DataSet');
        this.addTriple(datasetUri, Namespaces_1.default.rdfs + 'label', `"${meta.title}"`);
        this.addTriple(datasetUri, Namespaces_1.default.rdfs + 'comment', `"${meta.notes}"`);
        // this.addTriple(datasetUri, ns.qb + 'structure', this.fetcherParams.dsd); // overlap
        // Dates
        this.addTriple(datasetUri, Namespaces_1.default.dct + 'modified', `"${meta.metadata_modified}"`);
        // License
        if (meta.license_url) {
            this.addTriple(datasetUri, Namespaces_1.default.dct + 'license', meta.license_url);
        }
        if (meta.license_title) {
            this.addTriple(meta.license_url, Namespaces_1.default.rdfs + 'label', `"${meta.license_title}"`);
        }
        // Publishing organization
        if (meta.organization) {
            const org = meta.organization;
            const orgBaseIri = this.fetcherParams.ckanUrl + 'organization/';
            const orgIri = orgBaseIri + org.name;
            this.addTriple(datasetUri, Namespaces_1.default.dct + 'publisher', orgIri);
            this.addTriple(orgIri, Namespaces_1.default.rdf + 'type', Namespaces_1.default.org + 'Organization');
            this.addTriple(orgIri, Namespaces_1.default.rdfs + 'label', `"${org.title}"`);
            this.addTriple(orgIri, Namespaces_1.default.rdfs + 'comment', `"${org.description}"`);
        }
        // Groups
        if (meta.groups) {
            const groupBaseIri = this.fetcherParams.ckanUrl + 'group/';
            meta.groups.forEach((group) => {
                const groupUri = groupBaseIri + group.name;
                this.addTriple(datasetUri, Namespaces_1.default.dct + 'subject', groupUri);
                this.addTriple(groupUri, Namespaces_1.default.rdf + 'type', Namespaces_1.default.bm + 'Topic');
                this.addTriple(groupUri, Namespaces_1.default.rdfs + 'label', `"${group.title}"`);
                this.addTriple(groupUri, Namespaces_1.default.rdfs + 'comment', `"${group.description}"`);
            });
        }
        // Tags
        if (meta.tags) {
            var tagBaseIri = this.fetcherParams.ckanUrl + 'dataset?tags=';
            meta.tags.forEach((tag) => {
                const tagUri = tagBaseIri + encodeURIComponent(tag.name);
                this.addTriple(datasetUri, Namespaces_1.default.dct + 'subject', tagUri);
                this.addTriple(tagUri, Namespaces_1.default.rdf + 'type', Namespaces_1.default.bm + 'Tag');
                this.addTriple(tagUri, Namespaces_1.default.rdfs + 'label', `"${tag.display_name}"`);
            });
        }
        // Extras
        if (meta.extras) {
            var extraBaseIri = this.fetcherParams.ckanUrl + '#meta-';
            meta.extras.forEach((extra) => {
                var extraUri = extraBaseIri + _s.dasherize(extra.key.toLowerCase());
                this.addTriple(datasetUri, extraUri, `"${extra.value}"`);
                this.addTriple(extraUri, Namespaces_1.default.rdfs + 'label', `"${extra.key}"`);
                if (extra.key === 'Rujukan' && _s.startsWith(extra.value, 'http')) {
                    this.addTriple(datasetUri, Namespaces_1.default.rdfs + 'seeAlso', extra.value);
                }
            });
        }
    }
    fetch() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.fetcherParams.datasetId) {
                this.error('No dataset was specified.');
                return;
            }
            let datasetMetadata = yield this.fetchCkanMetadata();
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
                yield csvFetcher.fetch();
            }
        });
    }
}
exports.default = IdGovCkanDatasetFetcher;
