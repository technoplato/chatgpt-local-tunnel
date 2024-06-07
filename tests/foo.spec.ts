// import { clearTerminal } from './utils'
//
// type PatchFile = string
//
// type FileContents = {
//   [filePath: string]: string
// }
//
// type PatchValidationResult = {
//   isValid: boolean
//   searchString?: string
//   replaceString?: string
//   errors?: string[]
// }
//
// type PatchData = {
//   filePath: string
//   sections: PatchSection[]
// }
//
// type PatchSection = {
//   linesToRemove: string[]
//   linesToAdd: string[]
//   contextLines: string[]
// }
//
// function parsePatchFile(patchFile: PatchFile): PatchData[] {
//   const lines = patchFile
//     .split('\n')
//     .filter((line) => line.trim() !== '')
//   const patches: PatchData[] = []
//
//   let currentFilePath = ''
//   let previousFilePath = ''
//   let currentSections: PatchSection[] = []
//   let currentSection: PatchSection = {
//     linesToRemove: [],
//     linesToAdd: [],
//     contextLines: [],
//   }
//
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i]
//
//     if (line.startsWith('--- ')) {
//       if (currentFilePath && currentSections.length > 0) {
//         patches.push({
//           filePath: currentFilePath,
//           sections: currentSections,
//         })
//       }
//       currentFilePath = line.replace(/^--- /, '')
//       if (currentFilePath !== previousFilePath) {
//         patches.push({
//           filePath: currentFilePath,
//           sections: currentSections,
//         })
//       }
//       previousFilePath = currentFilePath
//       currentSections = []
//       currentSection = {
//         linesToRemove: [],
//         linesToAdd: [],
//         contextLines: [],
//       }
//     } else if (line.startsWith('+++ ')) {
//       const newFilePath = line.replace(/^(\+\+\+ )/, '')
//       if (newFilePath !== currentFilePath) {
//         throw new Error(
//           `Mismatched file paths: ${currentFilePath} and ${newFilePath}`,
//         )
//       }
//     } else if (line.startsWith('@@')) {
//       if (
//         currentSection.linesToRemove.length ||
//         currentSection.linesToAdd.length ||
//         currentSection.contextLines.length
//       ) {
//         currentSections.push(currentSection)
//       }
//       currentSection = {
//         linesToRemove: [],
//         linesToAdd: [],
//         contextLines: [],
//       }
//     } else if (line.startsWith('-')) {
//       if (line === '-') {
//         currentSection.linesToRemove.push('\n')
//       } else {
//         currentSection.linesToRemove.push(line.substring(1))
//       }
//     } else if (line.startsWith('+')) {
//       if (line === '+') {
//         currentSection.linesToAdd.push('\n')
//       } else {
//         currentSection.linesToAdd.push(line.substring(1))
//       }
//     } else {
//       currentSection.contextLines.push(line)
//     }
//   }
//
//   if (currentFilePath && currentSections.length > 0) {
//     if (
//       currentSection.linesToRemove.length ||
//       currentSection.linesToAdd.length ||
//       currentSection.contextLines.length
//     ) {
//       currentSections.push(currentSection)
//     }
//   } else if (
//     currentFilePath
//     // Object.values(currentSection).some((x) => x?.length > 0)
//   ) {
//     currentSections = [currentSection]
//   }
//
//   patches.push({
//     filePath: currentFilePath,
//     sections: currentSections,
//   })
//
//   return patches
// }
//
// function wrapWithPoundSymbols(message: string): string {
//   const lines = message.split('\n')
//   const maxLength = Math.max(...lines.map((line) => line.length))
//   const border = '#'.repeat(maxLength + 4)
//
//   const framedLines = lines.map(
//     (line) => `# ${line.padEnd(maxLength)} #`,
//   )
//   return `\n${border}\n${framedLines.join('\n')}\n${border}`
// }
//
// function validatePatch(
//   patchFile: PatchFile,
//   fileContents: FileContents,
// ): PatchValidationResult[] {
//   const patchData = parsePatchFile(patchFile)
//   const results: PatchValidationResult[] = []
//
//   patchData.forEach(({ filePath, sections }) => {
//     const originalContent = fileContents[filePath]
//
//     if (!originalContent) {
//       console.log(`File not found: ${filePath}`)
//       console.log(fileContents)
//       results.push({
//         isValid: false,
//         errors: [`File not found: ${filePath}`],
//       })
//       return
//     }
//
//     console.log(
//       'Original Content:',
//       wrapWithPoundSymbols(originalContent),
//     )
//     console.log('Patch', wrapWithPoundSymbols(patchFile))
//     sections.forEach((section) => {
//       const { linesToRemove, contextLines } = section
//       const searchString = [...contextLines, ...linesToRemove].join(
//         '\n',
//       )
//       const replaceString = [
//         ...contextLines,
//         ...section.linesToAdd,
//       ].join('\n')
//
//       console.log(
//         'Search String:',
//         wrapWithPoundSymbols(searchString),
//       )
//       console.log(
//         'Replace String:',
//         wrapWithPoundSymbols(replaceString),
//       )
//
//       if (!originalContent.includes(searchString)) {
//         results.push({
//           isValid: false,
//           errors: [
//             'Patch context does not match original file content',
//           ],
//           searchString,
//           replaceString,
//         })
//       } else {
//         results.push({
//           isValid: true,
//           searchString,
//           replaceString,
//         })
//       }
//     })
//   })
//
//   return results
// }
//
// describe('validatePatch', () => {
//   beforeAll(async () => {
//     await clearTerminal()
//     await new Promise((resolve) => setTimeout(resolve, 140))
//   })
//   it('should validate a correct patch that changes multiple files', () => {
//     const exampleFile = `
// const greeting = "Hello, World!";
// console.log(greeting);
// `
//
//     const simpleDiff = `
// --- path/to/file.ts
// +++ path/to/file.ts
// @@ ... @@
//      greet() {
// -        return "Hello, " + this.greeting;
// +        return "Hi, " + this.greeting;
//      }
// `
//
//     const results = validatePatch(exampleFile, {
//       'path/to/file.ts': simpleDiff,
//     })
//
//     console.log('Results:', results)
//
//     expect(results.length).toBe(1) // Adjusted to match the correct number of sections
//
//     const result1 = results[0]
//     expect(result1.replaceString)
//       .toBe(`export function subtractTwice(a: number, b: number): number {
//     return a - b - b;`)
//
//     const result2 = results[1]
//     expect(result2.replaceString).toBe(`export const PI = 3.14;`)
//   })
// })
