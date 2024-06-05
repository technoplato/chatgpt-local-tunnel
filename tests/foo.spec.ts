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
  'third_example.ts': `export const PI = 3.14159;

export function circumference(radius: number): number {
    return 2 * PI * radius;
}

export function area(radius: number): number {
    return PI * radius * radius;
}`,
}

const validPatchSecondExample: PatchFile = `
--- second_example.ts
+++ second_example.ts
@@ -5,7 +5,7 @@
 export function subtract(a: number, b: number): number {
     return a - b;
 }
- 
+ 
 export function mod(a: number, b: number): number {
     return a % b;
 }
`

const validPatchThirdExample: PatchFile = `
--- third_example.ts
+++ third_example.ts
@@ -1,4 +1,4 @@
-export const PI = 3.14159;
+export const PI = 3.14;
 export function circumference(radius: number): number {
     return 2 * PI * radius;
 }
`

const combinedPatch: PatchFile = `
${validPatchSecondExample}
${validPatchThirdExample}
`

type PatchFile = string

type FileContents = {
  [filePath: string]: string
}

type PatchValidationResult = {
  isValid: boolean
  searchString?: string
  replaceString?: string
  errors?: string[]
}

type PatchData = {
  filePath: string
  sections: PatchSection[]
}

type PatchSection = {
  linesToRemove: string[]
  linesToAdd: string[]
  contextLines: string[]
}

function parsePatchFile(patchFile: PatchFile): PatchData[] {
  const lines = patchFile
    .split('\n')
    .filter((line) => line.trim() !== '')
  const patches: PatchData[] = []

  let currentFilePath = ''
  let currentSections: PatchSection[] = []
  let currentSection: PatchSection = {
    linesToRemove: [],
    linesToAdd: [],
    contextLines: [],
  }

  console.log('Parsing patch file...')
  for (const line of lines) {
    console.log(`Processing line: ${line}`)
    if (line.startsWith('--- ')) {
      if (currentFilePath && currentSections.length > 0) {
        patches.push({
          filePath: currentFilePath,
          sections: currentSections,
        })
      }
      currentFilePath = line.replace(/^--- /, '')
      currentSections = []
      currentSection = {
        linesToRemove: [],
        linesToAdd: [],
        contextLines: [],
      }
      console.log(`Current file path set to: ${currentFilePath}`)
    } else if (line.startsWith('+++ ')) {
      const newFilePath = line.replace(/^(\+\+\+ )/, '')
      if (newFilePath !== currentFilePath) {
        throw new Error(
          `Mismatched file paths: ${currentFilePath} and ${newFilePath}`,
        )
      }
      console.log(`New file path confirmed: ${newFilePath}`)
    } else if (line.startsWith('@@')) {
      if (
        currentSection.linesToRemove.length ||
        currentSection.linesToAdd.length ||
        currentSection.contextLines.length
      ) {
        currentSections.push(currentSection)
      }
      currentSection = {
        linesToRemove: [],
        linesToAdd: [],
        contextLines: [],
      }
      console.log('New section identified')
    } else if (line.startsWith('-')) {
      currentSection.linesToRemove.push(line.substring(1))
      console.log(`Line to remove added: ${line.substring(1)}`)
    } else if (line.startsWith('+')) {
      currentSection.linesToAdd.push(line.substring(1))
      console.log(`Line to add added: ${line.substring(1)}`)
    } else {
      currentSection.contextLines.push(line)
      console.log(`Context line added: ${line}`)
    }
  }

  if (currentFilePath && currentSections.length > 0) {
    if (
      currentSection.linesToRemove.length ||
      currentSection.linesToAdd.length ||
      currentSection.contextLines.length
    ) {
      currentSections.push(currentSection)
    }
    patches.push({
      filePath: currentFilePath,
      sections: currentSections,
    })
    console.log(`Patch added for file: ${currentFilePath}`)
  }

  console.log('Patch file parsing complete.')
  return patches
}

function validatePatch(
  patchFile: PatchFile,
  fileContents: FileContents,
): PatchValidationResult[] {
  const patchData = parsePatchFile(patchFile)
  const results: PatchValidationResult[] = []

  console.log('Validating patches...')
  for (const { filePath, sections } of patchData) {
    const originalContent = fileContents[filePath]
    console.log(`Validating file: ${filePath}`)

    if (!originalContent) {
      results.push({
        isValid: false,
        errors: [`File not found: ${filePath}`],
      })
      console.log(`File not found: ${filePath}`)
      continue
    }

    for (const section of sections) {
      const { linesToRemove, contextLines } = section
      const searchString = [...contextLines, ...linesToRemove].join(
        '\n',
      )
      const replaceString = [
        ...contextLines,
        ...section.linesToAdd,
      ].join('\n')

      console.log(`Search string: ${searchString}`)
      console.log(`Replace string: ${replaceString}`)

      if (!originalContent.includes(searchString)) {
        results.push({
          isValid: false,
          errors: [
            'Patch context does not match original file content',
          ],
          searchString,
          replaceString,
        })
        console.log(
          'Patch context does not match original file content',
        )
      } else {
        results.push({ isValid: true, searchString, replaceString })
        console.log('Patch validated successfully')
      }
    }
  }

  console.log('Patch validation complete.')
  return results
}

export { validatePatch }
export type { FileContents, PatchFile, PatchValidationResult }

// Test case:

describe('validatePatch', () => {
  it('should validate a correct patch that changes multiple files', () => {
    const results = validatePatch(
      combinedPatch,
      fileContentsSecondExample,
    )

    console.log('Results:', results)

    const result1 = results[0]
    expect(result1.replaceString)
      .toBe(`export function subtractTwice(a: number, b: number): number {
    return a - b - b;`)

    const result2 = results[1]
    expect(result2.searchString).toBe(`export const PI = 3.14159;`)

    const result3 = results[2]
    expect(result3.replaceString).toBe(`export const PI = 3.14;`)

    const result4 = results[3]
    expect(result4.replaceString)
      .toBe(`export function diameter(radius: number): number {
    return 2 * radius;
}`)
  })
})
