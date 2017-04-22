import * as XXH from 'xxhashjs';

export class Hasher {
  private _seed : number;
  public get seed() : number {
    return this._seed;
  }
  public set seed(v : number) {
    this._seed = v;
    this.hasherObject = new XXH.h32(this._seed);
  }

  radix: number = 32;
  private hasherObject: XXH.h32;

  constructor(options?: {
    seed?: number,
    radix?: number
  }) {
    if (options.seed !== undefined) {
      this.seed = options.seed;
    }
    else {
      this.seed = 8;
    }

    if (options.radix !== undefined) {
      this.radix = options.radix;
    }
    else {
      this.radix = 36;
    }
  }

  getHashString(unhashed: string | NodeBuffer | ArrayBuffer): string {
    return this.hasherObject.update(unhashed).digest().toString(this.radix);
  }
}