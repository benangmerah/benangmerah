declare module 'p-queue' {
  interface PQueueConstructorOptions {
    concurrency?: number,
    queueClass?: Function
  }

  interface PQueueAddOptions {
    priority?: number
  }

  class PQueue {
    constructor(options?: PQueueConstructorOptions);
    add(fn: () => Promise<any>, options?: PQueueAddOptions): Promise<any>;
    onEmpty(): Promise<any>;
    readonly size: number;
    readonly pending: number;
  }

  export = PQueue;
}

declare module 'xxhashjs' {
  class UINT {
    fromNumber(number: number): UINT;
    fromString(string: string, radix: number): UINT;
    toNumber(): number;
    toString(radix: number): string;
    add(uint: UINT): UINT;
    subtract(uint: UINT): UINT;
    multiply(uint: UINT): UINT;
    div(uint: UINT): UINT;
    negate(): UINT;
    equals(uint: UINT): boolean;
    eq(uint: UINT): boolean;
    lessThan(uint: UINT): boolean;
    lt(uint: UINT): boolean;
    greaterThan(uint: UINT): boolean;
    gt(uint: UINT): boolean;
    not(): UINT;
    or(uint: UINT): UINT;
    and(uint: UINT): UINT;
    xor(uint: UINT): UINT;
    shiftRight(number: number): UINT;
    shiftr(number: number): UINT;
    shiftLeft(number: number, allowOverflow: boolean): UINT;
    shiftl(number: number, allowOverflow: boolean): UINT;
    rotateLeft(number: number): UINT;
    rotateRight(number: number): UINT;
    clone(): UINT;
  }

  class UINT32 extends UINT {
    fromBits(lowBits: number, highBits: number): UINT32;
  }

  class UINT64 extends UINT {
    fromBits(lowBits: number, highBits: number): UINT64;
    fromBits(firstLowBits: number, secondLowBits: number, firstHighBits: number, secondHighBits: number): UINT64;
  }

  class XXH {
    constructor(seed: number);
    init(seed: number): XXH;
    update(data: string | ArrayBuffer | NodeBuffer): XXH;
    digest(): UINT;
  }

  export class h32 extends XXH {
    constructor(seed: number);
    digest(): UINT32;
  }

  export class h64 extends XXH {
    constructor(seed: number);
    digest(): UINT64;
  }
}

declare module 'csv-parser' {
  interface CsvParserOptions {
    raw?: boolean;
    separator?: string;
    quote?: string;
    escape?: string;
    newline?: string;
    strict?: boolean;
  }

  interface Parser extends NodeJS.ReadWriteStream { }

  function csvParser(opts?: CsvParserOptions): Parser;

  export = csvParser;
}
declare module 'isnumeric';