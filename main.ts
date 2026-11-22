// Exact tiny stack VM: wrapping int32, every trap code, step/output limits.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode tables by byte: [op, immediate bytes, pops, pushes]; absent = trap 5.
const IMM = [], POP = [], PSH = [];
for (const [o, i, a, b] of [[0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],[5,0,2,2],[6,0,2,3],[7,0,3,3],[23,0,1,1],[27,0,1,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],[52,0,0,0],[64,0,1,1],[65,0,2,0],[80,0,1,0],[81,0,1,0],[82,0,0,1],[83,0,1,0]]) { IMM[o] = i; POP[o] = a; PSH[o] = b; }
for (let o = 16; o <= 34; o++) if (o !== 23 && o !== 27 && o !== 31) { IMM[o] = 0; POP[o] = 2; PSH[o] = 1; }

function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  for (;;) {
    if (steps === 1000000) return { out: out.subarray(0, olen), code: 10 };
    if (pc < 0 || pc >= n) return { out: out.subarray(0, olen), code: 9 };
    const op = p[pc];
    const imm = IMM[op];
    if (imm === undefined) return { out: out.subarray(0, olen), code: 5 };
    if (pc + imm >= n) return { out: out.subarray(0, olen), code: 9 };
    steps++;
    if (sp < POP[op]) return { out: out.subarray(0, olen), code: 2 };
    if (sp - POP[op] + PSH[op] > 256) return { out: out.subarray(0, olen), code: 3 };
    const next = pc + 1 + imm;
    pc = next;
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) {
      const b = D[sp - 1], a = D[sp - 2];
      let r;
      if (op === 0x10) r = (a + b) | 0;
      else if (op === 0x11) r = (a - b) | 0;
      else if (op === 0x12) r = Math.imul(a, b);
      else if (op === 0x13) { if (b === 0) return { out: out.subarray(0, olen), code: 4 }; r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
      else if (op === 0x14) { if (b === 0) return { out: out.subarray(0, olen), code: 4 }; r = b === -1 ? 0 : (a % b) | 0; }
      else if (op === 0x15) { if (b === 0) return { out: out.subarray(0, olen), code: 4 }; r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
      else if (op === 0x16) { if (b === 0) return { out: out.subarray(0, olen), code: 4 }; r = ((a >>> 0) % (b >>> 0)) | 0; }
      else if (op === 0x18) r = a & b;
      else if (op === 0x19) r = a | b;
      else if (op === 0x1a) r = a ^ b;
      else if (op === 0x1c) r = a << (b & 31);
      else if (op === 0x1d) r = a >> (b & 31);
      else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
      else if (op === 0x20) r = a === b ? 1 : 0;
      else if (op === 0x21) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0; // 0x22 LTU
      sp -= 2; D[sp++] = r;
      continue;
    }
    switch (op) {
      case 0x00: return { out: out.subarray(0, olen), code: 0 };
      case 0x01: D[sp++] = (p[next - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === 64) return { out: out.subarray(0, olen), code: 7 };
        C[csp++] = next;
        pc = p[next - 2] | (p[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) return { out: out.subarray(0, olen), code: 8 };
        pc = C[--csp];
        break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr > 255) return { out: out.subarray(0, olen), code: 6 };
        D[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = D[sp - 1], v = D[sp - 2];
        if (addr < 0 || addr > 255) return { out: out.subarray(0, olen), code: 6 };
        sp -= 2; M[addr] = v;
        break;
      }
      case 0x50: {
        const s = String(D[sp - 1]);
        if (olen + s.length > 65536) return { out: out.subarray(0, olen), code: 11 };
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return { out: out.subarray(0, olen), code: 11 };
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return { out: out.subarray(0, olen), code: D[--sp] & 255 };
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
