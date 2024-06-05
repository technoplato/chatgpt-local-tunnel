import { expect, test as it, describe, beforeEach } from 'bun:test'
import {
  type FileContents,
  type PatchFile,
  type PatchValidationResult,
  validatePatch,
} from './patchValidator.ts'
import { clearTerminal } from './utils.ts'

describe('validatePatch', () => {
  const validPatch: PatchFile = `
--- example.py
+++ example.py
@@ ... @@
-def hello():
-    print("Hello, world!")
+def hello():
+    print("Hello, Universe!")
`

  const fileContents: FileContents = {
    'example.py': `def hello():
    print("Hello, world!")`,
  }

  beforeEach(async () => {
    await clearTerminal()
    await new Promise((resolve) => setTimeout(resolve, 70))
  })

  it('should validate a correct patch that changes a print statement', () => {
    const result: PatchValidationResult = validatePatch(
      validPatch,
      fileContents,
    )
    expect(result.isValid).toBe(true)
    expect(result.searchString).toBe(`def hello():
    print("Hello, world!")`)
    expect(result.replaceString).toBe(`def hello():
    print("Hello, Universe!")`)
  })

  const validPatchSecondExample: PatchFile = `
--- second_example.ts
+++ second_example.ts
@@ ... @@
-export function subtract(a: number, b: number): number {
-    return a - b;
+export function subtractTwice(a: number, b: number): number {
+    return a - b - b;
@@ ... @@
+export function power(a: number, b: number): number {
+    return Math.pow(a, b);
+}
`

  const fileContentsSecondExample: FileContents = {
    'second_example.ts': `export function add(a: number, b: number): number {
    return a + b;
}

export function subtract(a: number, b: number): number {
    return a - b;
}

export function multiply(a: number, b: number): number {
    return a * b;
}

export function divide(a: number, b: number): number {
    if (b === 0) {
        throw new Error("Division by zero");
    }
    return a / b;
}

export function mod(a: number, b: number): number {
    return a % b;
}

export function power(a: number, b: number): number {
    return Math.pow(a, b);
}`,
  }

  it('should validate a correct patch that changes subtract to subtractTwice and adds power function', () => {
    const result: PatchValidationResult = validatePatch(
      validPatchSecondExample,
      fileContentsSecondExample,
    )
    expect(result.isValid).toBe(true)
    expect(result.searchString)
      .toBe(`export function subtract(a: number, b: number): number {
 return a - b;`)
    expect(result.replaceString)
      .toBe(`export function subtractTwice(a: number, b: number): number {
    return a - b - b;`)
  })
})
