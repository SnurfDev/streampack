import {Readable, Writable} from "node:stream";

export class BufferWriter extends Writable {
    private ptr = 0;

    constructor(
        public buffer: Buffer = Buffer.alloc(0),
        private allowResize = true,
    ) {
        super();
    }

    _write(
        chunk: any,
        encoding: BufferEncoding,
        callback: (error?: Error | null) => void,
    ): void {
        if (!(chunk instanceof Buffer) && typeof chunk !== "string")
            return callback(new Error("Invalid chunk type: " + typeof chunk));
        let data: Buffer;

        if (typeof chunk == "string") {
            data = Buffer.from(chunk, encoding);
        } else {
            data = chunk;
        }

        if (this.ptr + data.length > this.buffer.length) {
            if (!this.allowResize)
                return callback(new Error("Write out of bounds of buffer"));

            this.buffer = Buffer.concat([
                this.buffer,
                Buffer.alloc(this.ptr + chunk.length - this.buffer.length),
            ]);
        }

        this.ptr += data.copy(this.buffer, this.ptr);
    }
}

export interface ReadableStruct {
    read(reader: StreamReader): void;
}

export class StreamReader {
    stream: Readable;
    private chunk: Buffer = Buffer.alloc(0);

    private get endiannessSuffix() {
        return this.isBigEndian ? "BE" : "LE";
    }

    constructor(
        source: Buffer | Readable,
        private isBigEndian: boolean = false,
    ) {
        if (source instanceof Buffer) {
            this.stream = Readable.from(source);
        } else {
            this.stream = source as Readable;
        }
    }

    private read(n: number): Buffer {
        let ndata = this.stream.read();

        if (ndata) this.chunk = Buffer.concat([this.chunk, ndata]);

        if (this.chunk.length < n)
            throw new Error("Stream can't keep up with reader.");

        let buf = this.chunk.subarray(0, n);

        this.chunk = this.chunk.subarray(n);

        return buf;
    }

    // byte
    u8() {
        return this.read(1)["readUInt8"]();
    }
    i8() {
        return this.read(1)["readInt8"]();
    }

    // integers
    u16() {
        return this.read(2)[`readUInt16${this.endiannessSuffix}`]();
    }
    u32() {
        return this.read(4)[`readUInt32${this.endiannessSuffix}`]();
    }
    u64() {
        return this.read(4)[`readBigUInt64${this.endiannessSuffix}`]();
    }
    i16() {
        return this.read(2)[`readInt16${this.endiannessSuffix}`]();
    }
    i32() {
        return this.read(4)[`readInt32${this.endiannessSuffix}`]();
    }
    i64() {
        return this.read(4)[`readBigInt64${this.endiannessSuffix}`]();
    }

    // floats
    f32() {
        return this.read(4)[`readFloat${this.endiannessSuffix}`]();
    }
    f64() {
        return this.read(4)[`readDouble${this.endiannessSuffix}`]();
    }

    // boolean
    bool() {
        return this.u8() != 0;
    }

    // c-string
    c_str() {
        let str = "";
        let b: Buffer;

        while ((b = this.read(1))[0]) {
            str += b.toString("utf8");
        }

        return str;
    }

    c_wstr() {
        let str = "";
        let b: Buffer;

        while ((b = this.read(2))[`readUint16${this.endiannessSuffix}`]()) {
            str += b.toString("utf16le");
        }

        return str;
    }

    // n-string
    n_str() {
        return this.read(this.u8()).toString("utf8");
    }

    // raw
    bytes(n: number) {
        return this.read(n);
    }

    // struct
    struct<T extends ReadableStruct>(struct: new () => T): T {
        const v = new struct();
        v.read(this);
        return v;
    }
}

function bufferWriter<
    T extends {
        [K in keyof Buffer]: K extends `write${string}` ? K : never;
    }[keyof Buffer],
>(fn: T, v: Parameters<Buffer[T]>[0]): Buffer {
    const buf = Buffer.allocUnsafe(256); // Max Len
    const n = (buf[fn] as (v: Parameters<Buffer[T]>[0]) => number)(v);
    return buf.subarray(0, n);
}

export interface WritableStruct {
    write(writer: StreamWriter): void;
}

export class StreamWriter {
    stream: Writable;

    private get endiannessSuffix() {
        return this.isBigEndian ? "BE" : "LE";
    }

    constructor(
        destination: Writable,
        private isBigEndian: boolean = false,
    ) {
        this.stream = destination;
    }

    private write(bytes: Buffer): void {
        this.stream.write(bytes);
    }

    // byte
    u8(value: number) {
        this.write(bufferWriter("writeUInt8", value));
        return this;
    }
    i8(value: number) {
        this.write(bufferWriter("writeInt8", value));
        return this;
    }

    // integers
    u16(value: number) {
        this.write(bufferWriter(`writeUInt16${this.endiannessSuffix}`, value));
        return this;
    }
    u32(value: number) {
        this.write(bufferWriter(`writeUInt32${this.endiannessSuffix}`, value));
        return this;
    }
    u64(value: bigint) {
        this.write(
            bufferWriter(`writeBigUInt64${this.endiannessSuffix}`, value),
        );
        return this;
    }
    i16(value: number) {
        this.write(bufferWriter(`writeInt16${this.endiannessSuffix}`, value));
        return this;
    }
    i32(value: number) {
        this.write(bufferWriter(`writeInt32${this.endiannessSuffix}`, value));
        return this;
    }
    i64(value: bigint) {
        this.write(
            bufferWriter(`writeBigInt64${this.endiannessSuffix}`, value),
        );
        return this;
    }

    // floats
    f32(value: number) {
        this.write(bufferWriter(`writeFloat${this.endiannessSuffix}`, value));
        return this;
    }
    f64(value: number) {
        this.write(bufferWriter(`writeDouble${this.endiannessSuffix}`, value));
        return this;
    }

    // boolean
    bool(value: boolean) {
        this.u8(value ? 1 : 0);
    }

    // c-string
    c_str(str: string) {
        this.write(Buffer.from(str + "\x00", "utf8"));
        return this;
    }

    c_wstr(str: string) {
        this.write(Buffer.from(str + "\x00", "utf16le"));
        return this;
    }

    // n-string
    n_str(str: string) {
        this.u8(str.length);
        this.write(Buffer.from(str, "utf8"));
        return this;
    }

    // raw
    bytes(bytes: Buffer) {
        this.write(bytes);
        return this;
    }

    // struct
    struct<T extends WritableStruct>(struct: new () => T) {
        const v = new struct();
        v.write(this);
        return this;
    }
}

export function readFlags<const F extends readonly string[]>(
    buf: Buffer,
    a: F,
): {[I in F[number]]: boolean} {
    return Object.fromEntries(
        a.map((k, i) => [k, ((buf[Math.floor(i / 8)] >> i % 8) & 1) != 0]),
    ) as {[I in F[number]]: boolean};
}

export function writeFlags(flags: {[k: string]: boolean}): Buffer {
    const keys = Object.keys(flags);
    const buf = Buffer.alloc(Math.ceil(keys.length / 8));
    for (let i = 0; i < Math.ceil(keys.length / 8); i++) {
        let value = 0;
        for (let h = 0; h < Math.min(8, keys.length - i * 8); h++) {
            value |= (flags[keys[i * 8 + h]] ? 1 : 0) << h;
        }
    }
    return buf;
}

export type RWStruct = ReadableStruct & WritableStruct;
