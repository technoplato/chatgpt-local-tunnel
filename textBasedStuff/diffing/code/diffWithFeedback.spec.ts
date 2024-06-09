// import {
//   afterEach,
//   beforeAll,
//   beforeEach,
//   describe,
//   expect,
//   test as it,
// } from 'bun:test'
// import {
//   validatePatch,
//   type FileContents,
//   type PatchFile,
//   type PatchValidationResult,
// } from './patchValidator'
// import { clearTerminal } from './utils'

// describe('validatePatch', () => {
//   const validPatch: PatchFile = `
// --- example.py
// +++ example.py
// @@ ... @@
// -def hello():
// -    print("Hello, world!")
// +def hello():
// +    print("Hello, Universe!")
// `

//   const fileContents: FileContents = {
//     'example.py': `def hello():
//     print("Hello, world!")`,
//   }

//   beforeAll(async () => {
//     await clearTerminal()
//     await new Promise((resolve) => setTimeout(resolve, 140))
//   })

//   beforeEach(() => {
//     console.log(
//       '====================================================',
//     )
//     console.log(
//       '====================================================\n\n',
//     )
//   })

//   afterEach(() => {
//     console.log(
//       '====================================================',
//     )
//     console.log(
//       '====================================================\n\n',
//     )
//   })

//   it('should validate a correct patch that changes a print statement', () => {
//     const results: PatchValidationResult[] = validatePatch(
//       validPatch,
//       fileContents,
//     )
//     const result = results[0]
//     expect(result.isValid).toBe(true)
//     expect(result.searchString).toBe(`def hello():
//     print("Hello, world!")`)
//     expect(result.replaceString).toBe(`def hello():
//     print("Hello, Universe!")`)
//   })

//   const fileContentsSecondExample: FileContents = {
//     'second_example.ts': `export function add(a: number, b: number): number {
//     return a + b;
// }

// export function subtract(a: number, b: number): number {
//     return a - b;
// }

// export function multiply(a: number, b: number): number {
//     return a * b;
// }

// export function divide(a: number, b: number): number {
//     if (b === 0) {
//         throw new Error("Division by zero");
//     }
//     return a / b;
// }

// export function mod(a: number, b: number): number {
//     return a % b;
// }

// export function power(a: number, b: number): number {
//     return Math.pow(a, b);
// }`,
//     'third_example.ts': `export const PI = 3.14159;

// export function circumference(radius: number): number {
//     return 2 * PI * radius;
// }

// export function area(radius: number): number {
//     return PI * radius * radius;
// }`,
//   }

//   const validPatchSecondExample: PatchFile = `
// --- second_example.ts
// +++ second_example.ts
// @@ ... @@
// -export function subtract(a: number, b: number): number {
// -    return a - b;
// +export function subtractTwice(a: number, b: number): number {
// +    return a - b - b;
// @@ ... @@
// export function mod(a: number, b: number): number {
//     return a % b;
// }
// +
// +export function power(a: number, b: number): number {
// +    return Math.pow(a, b);
// +}
// `

//   const validPatchThirdExample: PatchFile = `
// --- third_example.ts
// +++ third_example.ts
// @@ ... @@
// -export const PI = 3.14159;
// +export const PI = 3.14;
// @@ ... @@
// export function area(radius: number): number {
//     return PI * radius * radius;
// }
// +
// +export function diameter(radius: number): number {
// +    return 2 * radius;
// +}
// --- third_example.ts
// +++ third_example.ts
// @@ ... @@
// -export const PI = 3.14159;
// +export const PI = 3.14;
// @@ ... @@
// export function area(radius: number): number {
//     return PI * radius * radius;
// }
// +
// +export function diameter(radius: number): number {
// +    return 2 * radius;
// +}
// `

//   const combinedPatch: PatchFile = `
// ${validPatchSecondExample}
// ${validPatchThirdExample}
// `

//   it.only('should validate a correct patch that changes multiple files', () => {
//     const results: PatchValidationResult[] = validatePatch(
//       combinedPatch,
//       fileContentsSecondExample,
//     )

//     // Check results for second_example.ts
//     const result1 = results[0]
//     expect(result1.searchString)
//       .toBe(`export function subtract(a: number, b: number): number {
//     return a - b;`)
//     expect(result1.replaceString)
//       .toBe(`export function subtractTwice(a: number, b: number): number {
//     return a - b - b;`)

//     const result2 = results[1]
//     expect(result2.searchString)
//       .toBe(`export function mod(a: number, b: number): number {
//     return a % b;
// }`)
//     expect(result2.replaceString)
//       .toBe(`export function mod(a: number, b: number): number {
//     return a % b;
// }

// export function power(a: number, b: number): number {
//     return Math.pow(a, b);
// }`)

//     // Check results for third_example.ts
//     const result3 = results[2]
//     expect(result3.searchString).toBe(`export const PI = 3.14159;`)
//     expect(result3.replaceString).toBe(`export const PI = 3.14;`)

//     const result4 = results[3]
//     expect(result4.searchString)
//       .toBe(`export function area(radius: number): number {
//     return PI * radius * radius;
// }`)
//     expect(result4.replaceString)
//       .toBe(`export function area(radius: number): number {
//     return PI * radius * radius;
// }

// export function diameter(radius: number): number {
//     return 2 * radius;
// }`)
//     expect(result1.isValid).toBe(true)
//     expect(result2.isValid).toBe(true)
//     expect(result3.isValid).toBe(true)
//     expect(result4.isValid).toBe(true)
//   })
// })
