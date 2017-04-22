import { DataSourceDefinition } from '../lib/BaseFetcher';
import DataGoIdDatasetFetcher from '../fetchers/IdGovCkanDatasetFetcher';
import { fetcherMap } from '../fetchers';

const definition: DataSourceDefinition = {
  name: 'test',
  fetcherClassName: 'DataGoIdDatasetFetcher',
  fetcherParams: {
    // csvUrl: 'http://data.go.id/storage/f/2014-04-07T07%3A36%3A16.048Z/processed-pengguna-alat-kb-2005-2009.csv',
    // datasetIri: 'http://data.go.id/dataset/persentase-pengguna-alat-keluarga-berencana-kb'
    ckanUrl: 'http://data.jakarta.go.id/',
    datasetId: 'data-jumlah-siswa-dan-guru-sd-negeri-provinsi-dki-jakarta'
  }
};

const fetcherInstance = new DataGoIdDatasetFetcher(definition, { fetcherMap });

fetcherInstance.on('triple', triple => {
  const objectPart = triple.object[0] === '"' ? triple.object : `<${triple.object}>`;
  const sentence = `<${triple.subject}> <${triple.predicate}> ${objectPart}.`;
  console.log(sentence);
});

fetcherInstance.fetch();