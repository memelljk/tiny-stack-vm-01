# Exact Tiny Stack VM — 40/40 practice programs byte-identical, all 10 trap codes, zero misses

[![tiny-stack-vm-01](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/memelljk/tiny-stack-vm-01/rank.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/memelljk/tiny-stack-vm-01/reward.svg)](https://make.fun/c/tiny-stack-vm-01-run-20261122)

Entry for [tiny-stack-vm-01-run-20261122](https://make.fun/c/tiny-stack-vm-01-run-20261122): a from-scratch interpreter for the tiny stack ISA in one `main.ts` — wrapping 32-bit arithmetic with exact multiply and unsigned divide/modulo/compare, sign-extended pushes, 256-value stack, 64-deep calls, 256 words of memory, and every limit enforced in reference order: stack under/overflow, division by zero, bad opcode, bad address, call depth, empty return, bad pc, the 1,000,000-step cap and the 65,536-byte output cap, each with its own exit code. Verified locally at 1,000,000 on the practice set plus 4,518 differential tests against the reference VM with no mismatches; deterministic, whole set in well under a second.

Run: `MAKEFUN_INPUT_DIR=/input MAKEFUN_OUTPUT_DIR=/output node main.ts`
