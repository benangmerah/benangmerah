"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IdGovCkanDatasetFetcher_1 = require("../fetchers/IdGovCkanDatasetFetcher");
const fetchers_1 = require("../fetchers");
const definition = {
    name: 'test',
    fetcherClassName: 'DataGoIdDatasetFetcher',
    fetcherParams: {
        // csvUrl: 'http://data.go.id/storage/f/2014-04-07T07%3A36%3A16.048Z/processed-pengguna-alat-kb-2005-2009.csv',
        // datasetIri: 'http://data.go.id/dataset/persentase-pengguna-alat-keluarga-berencana-kb'
        ckanUrl: 'http://data.jakarta.go.id/',
        datasetId: 'data-jumlah-siswa-dan-guru-sd-negeri-provinsi-dki-jakarta'
    }
};
const fetcherInstance = new IdGovCkanDatasetFetcher_1.default(definition, { fetcherMap: fetchers_1.fetcherMap });
fetcherInstance.on('triple', triple => {
    const objectPart = triple.object[0] === '"' ? triple.object : `<${triple.object}>`;
    const sentence = `<${triple.subject}> <${triple.predicate}> ${objectPart}.`;
    console.log(sentence);
});
fetcherInstance.fetch();
