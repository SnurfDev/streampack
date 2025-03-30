import {describe, expect, test} from '@jest/globals';
import { BufferWriter, StreamReader } from './index.js';

describe("BufferWriter",()=>{
    test("create new BufferWriter",()=>{
        expect(()=>new BufferWriter()).not.toThrow()
    })

    test("write to existing buffer",()=>{
        let buf = Buffer.alloc(16);
        let bw = new BufferWriter(buf,false)
        bw.write(Buffer.from([0x1]));
        bw.write(Buffer.from([0x2]));
        bw.write(Buffer.from([0x3]));
        expect(buf[0]).toBe(1);
        expect(buf[1]).toBe(2);
        expect(buf[2]).toBe(3);

        expect(buf).toBe(bw.buffer);
    })

    test("write to auto resize buffer",()=>{
        let bw = new BufferWriter()

        bw.write(Buffer.from([0x1]));
        bw.write(Buffer.from([0x2]));
        bw.write(Buffer.from([0x3]));

        expect(bw.buffer.length).toBe(3)

        expect(bw.buffer[0]).toBe(1);
        expect(bw.buffer[1]).toBe(2);
        expect(bw.buffer[2]).toBe(3);
    })
})

describe("StreamReader",()=>{
    test("create StreamReader",()=>{
        expect(()=>new StreamReader(Buffer.from([0x00,0x01,0x02,0x03]))).not.toThrow()
    })

    test("read u8()",()=>{
        const sr = new StreamReader(Buffer.from([0x00,0x7f,0xff]));
        
        expect(sr.u8()).toBe(0);
        expect(sr.u8()).toBe(127);
        expect(sr.u8()).toBe(255);
    })

    test("read i8()",()=>{
        const sr = new StreamReader(Buffer.from([0x00,0x7f,0xff]));
        
        expect(sr.i8()).toBe(0);
        expect(sr.i8()).toBe(127);
        expect(sr.i8()).toBe(-1);
    })
})