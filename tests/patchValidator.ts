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

function parsePatchFile(patchFile: PatchFile): PatchData | null {
  const lines = patchFile
    .split('\n')
    .filter((line) => line.trim() !== '')
  if (lines.length < 3) return null

  const filePath = lines[0].replace(/^--- /, '')
  const sections: PatchSection[] = []

  let currentSection: PatchSection = {
    linesToRemove: [],
    linesToAdd: [],
    contextLines: [],
  }

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('@@')) {
      if (
        currentSection.linesToRemove.length ||
        currentSection.linesToAdd.length ||
        currentSection.contextLines.length
      ) {
        sections.push(currentSection)
      }
      currentSection = {
        linesToRemove: [],
        linesToAdd: [],
        contextLines: [],
      }
    } else if (line.startsWith('-')) {
      currentSection.linesToRemove.push(line.substring(1))
    } else if (line.startsWith('+')) {
      currentSection.linesToAdd.push(line.substring(1))
    } else {
      currentSection.contextLines.push(line)
    }
  }

  if (
    currentSection.linesToRemove.length ||
    currentSection.linesToAdd.length ||
    currentSection.contextLines.length
  ) {
    sections.push(currentSection)
  }

  return { filePath, sections }
}

function wrapWithPoundSymbols(message: string): string {
  const lines = message.split('\n')
  const maxLength = Math.max(...lines.map((line) => line.length))
  const border = '#'.repeat(maxLength + 4)

  const framedLines = lines.map(
    (line) => `# ${line.padEnd(maxLength)} #`,
  )
  return `\n${border}\n${framedLines.join('\n')}\n${border}`
}

function validatePatch(
  patchFile: PatchFile,
  fileContents: FileContents,
): PatchValidationResult {
  const patchData = parsePatchFile(patchFile)
  if (!patchData) {
    return { isValid: false, errors: ['Invalid patch file format'] }
  }

  const { filePath, sections } = patchData
  const originalContent = fileContents[filePath]

  if (!originalContent) {
    return { isValid: false, errors: [`File not found: ${filePath}`] }
  }
  let searchString = ''
  let replaceString = ''

  for (const section of sections) {
    console.log('\n\n')
    const { linesToRemove, contextLines } = section
    searchString = [...contextLines, ...linesToRemove].join('\n')
    replaceString = [...contextLines, ...section.linesToAdd].join(
      '\n',
    )
    console.log(
      'Original Content:',
      wrapWithPoundSymbols(originalContent),
    )
    console.log('Patch', wrapWithPoundSymbols(patchFile))
    console.log('Search String:', wrapWithPoundSymbols(searchString))
    console.log(
      'Replace String:',
      wrapWithPoundSymbols(replaceString),
    )

    if (!originalContent.includes(searchString)) {
      return {
        isValid: false,
        errors: [
          'Patch context does not match original file content',
        ],
        searchString,
        replaceString,
      }
    }
  }

  return {
    isValid: true,
    searchString,
    replaceString,
  }
}

// Export functions for testing
export { validatePatch }

export type { PatchFile, FileContents, PatchValidationResult }
