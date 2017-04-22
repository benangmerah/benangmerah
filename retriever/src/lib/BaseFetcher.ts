import { EventEmitter } from 'eventemitter3';

export interface DataSourceDefinition {
  name: string;
  fetcherClassName: string;
  fetcherParams?: any;
}

export interface FetcherConstructor {
  new (definition: DataSourceDefinition, internalOptions?: FetcherInternalOptions): BaseFetcher
}

export interface FetcherInternalOptions {
  fetcherMap?: Map<string, FetcherConstructor>;
  parentFetcher?: BaseFetcher;
}

export abstract class BaseFetcher extends EventEmitter {
  definition: DataSourceDefinition;
  name: string;
  absoluteName: string;
  fetcherParams: any;

  dependentFetchers: Map<string, BaseFetcher> = new Map<string, BaseFetcher>();
  parentFetcher: BaseFetcher;
  private fetcherMap: Map<string, FetcherConstructor>;

  constructor(definition: DataSourceDefinition, internalOptions: FetcherInternalOptions = {}) {
    super();
    this.definition = definition;
    this.name = definition.name;
    this.fetcherParams = definition.fetcherParams;

    if (internalOptions.parentFetcher) {
      this.parentFetcher = internalOptions.parentFetcher;
      this.absoluteName = internalOptions.parentFetcher.name + '/' + this.name;
    }
    else {
      this.absoluteName = this.name;
    }

    this.fetcherMap = internalOptions.fetcherMap;

    this.init();
  }

  // Initialize the fetcher on downlevel classes
  init(): void {

  }

  addTriple(subject: string, predicate: string, object: string): void {
    const eventObject = {
      subject,
      predicate,
      object,
      dataSourceAbsoluteName: this.absoluteName,
      fetcherObject: this
    };

    if (this.parentFetcher) {
      this.parentFetcher.emit('triple', eventObject);
    }
    else {
      this.emit('triple', eventObject);
    }
  }

  addDependentFetcher(definition: DataSourceDefinition): BaseFetcher {
    if (!this.fetcherMap) {
      throw new Error(`Cannot add dependent fetcher ${definition.name} as fetcherMap is not defined.`);
    }

    const ctor: FetcherConstructor = this.fetcherMap.get(definition.fetcherClassName);

    if (!ctor) {
      throw new Error(``);
    }

    const fetcherObj = new ctor(definition, {
      fetcherMap: this.fetcherMap,
      parentFetcher: this
    });
    this.dependentFetchers.set(definition.name, fetcherObj);

    return fetcherObj;
  }

  // Implement this method to do fetch logic.
  // This method should call addTriple() for each triple, 
  abstract async fetch(): Promise<void>;

  log(level: string, message: any): void {
    this.emit('log', { level, message });
  }

  info(message: any): void {
    this.log('info', message);
  }

  error(message: any): void {
    this.log('error', message);
  }
}