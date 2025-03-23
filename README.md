# streampack

Easily read and write values to streams and buffers.
This module is a easier to use and typescript compatible version of the [binary](https://www.npmjs.com/package/binary) module that also works for writing.

## Usage

The package implements two main classes:

- `StreamReader` for reading from streams / buffers.
- `StreamWriter` for writing to streams / buffers.

In the initializer you need to specify a source/destination buffer or stream (Extends `Readable` / `Writable`). You can also optionally specify that the stream is big endian as the second argument (little endian is used by default).

### Types

The functions for reading and writing numbers are named after the rust number types as I find them easy to use.

- `i32`: 32 bit signed integer
- `u64`: 64 bit unsigned integer
- `f32`: 32 bit float
- `u8`: unsigned byte

Then there is a `bool` function which is just a byte (`0x00` = false, everything else is true).

For strings there are 3 functions:

- `c_str`: a string with null termination
- `w_str`: a wide (16 bit) string with null termination
- `n_str`: a string prefixed by its length as a singular byte

For general reading and writing of raw buffers there is a `bytes` function which takes the length as an argument.

### Dynamic Buffer Size

When writing to a buffer you normally need to account for the maximum size when allocating it. If you want to use a dynamic buffer size however, you can use the built in `BufferWriter` class like this:

```typescript
import { BufferWriter, StreamWriter } from "streampack"
const bufferWriter = new BufferWriter(
    Buffer.alloc(0) // Empty Buffer
    true            // Allow Resizing
);

const writer = new StreamWriter(bufferWriter);
writer.u8(1)
writer.u8(2)
writer.u8(3)

console.log(bufferWriter.buffer) // <Buffer 01 02 03>
```

## Examples

### Reading

You can read from either a stream or a buffer, this script reads two 32 bit integers (one signed and one unsigned), as well as a 64 bit float from stdin:

```typescript
import {StreamReader} from "streampack";

const reader = new StreamReader(process.stdin);

console.log("Value 1: " + reader.i32());
console.log("Value 2: " + reader.u32());
console.log("Value 3: " + reader.f64());
```

This script does the same for a buffer but this time with **big endianness**:

```typescript
import {StreamReader} from "streampack";

const buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x40, 0x08, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
]);

const reader = new StreamReader(
    process.stdin,
    true, // big endian
);

console.log("Value 1: " + reader.i32()); // 1
console.log("Value 2: " + reader.u32()); // 2
console.log("Value 3: " + reader.f64()); // 3
```

### Writing

Using this same method you can also write to buffers / streams.
This script writes a null terminated string (cstring) and the number 31 as a uint32 to stdout:

```typescript
import {StreamWriter} from "streampack";

const writer = new StreamWriter(process.stdout);

writer.c_str("Hello World!");
writer.u32(31);
```

This writes a length prefixed string to a buffer:

```typescript
import {StreamWriter} from "streampack";

const buf = Buffer.alloc(32);

const writer = new StreamWriter(process.stdout);

writer.n_str("Hello World!");

console.log(buf); // <Buffer 0c 48 65 6c 6c 6f 20 57 6f 72 6c 64 21 00 ...
```

# Installation

To install with npm:

```bash
npm i streampack
```

# License

MIT
