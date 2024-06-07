type PatchFile = string

type FileContents = {
  [filePath: string]: string
}

type PatchValidationResult = {
  isValid: boolean
  searchString?: string
  replaceString?: string
  originalContent?: string
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
  const lines = patchFile.split('\n')
  const patches: PatchData[] = []

  let currentFilePath = ''
  let currentSections: PatchSection[] = []
  let currentSection: PatchSection = {
    linesToRemove: [],
    linesToAdd: [],
    contextLines: [],
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

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
    } else if (line.startsWith('+++ ')) {
      // Ignore the +++ line
      continue
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
    } else if (line.startsWith('-')) {
      currentSection.linesToRemove.push(line.substring(1) + '\n')
    } else if (line.startsWith('+')) {
      currentSection.linesToAdd.push(line.substring(1) + '\n')
    } else {
      currentSection.contextLines.push(line + '\n')
    }
  }

  if (currentFilePath && currentSections.length > 0) {
    currentSections.push(currentSection)
  } else if (currentFilePath) {
    currentSections = [currentSection]
  }

  patches.push({
    filePath: currentFilePath,
    sections: currentSections,
  })

  console.log('Parsed Patch Data:', patches)

  return patches
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

function parsePatchFile(patchFile: PatchFile): PatchData[] {
  const lines = patchFile.split('\n')
  const patches: PatchData[] = []

  let currentFilePath = ''
  let currentSections: PatchSection[] = []
  let currentSection: PatchSection = {
    linesToRemove: [],
    linesToAdd: [],
    contextLines: [],
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

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
    } else if (line.startsWith('+++ ')) {
      // Ignore the +++ line
      continue
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
    } else if (line.startsWith('-')) {
      currentSection.linesToRemove.push(line.substring(1))
    } else if (line.startsWith('+')) {
      currentSection.linesToAdd.push(line.substring(1))
    } else {
      currentSection.contextLines.push(line)
    }
  }

  if (currentFilePath && currentSections.length > 0) {
    currentSections.push(currentSection)
  } else if (currentFilePath) {
    currentSections = [currentSection]
  }

  patches.push({
    filePath: currentFilePath,
    sections: currentSections,
  })

  return patches
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
): PatchValidationResult[] {
  const patchData = parsePatchFile(patchFile)
  const results: PatchValidationResult[] = []

  patchData.forEach(({ filePath, sections }) => {
    const originalContent = fileContents[filePath]

    if (!originalContent) {
      results.push({
        isValid: false,
        errors: [`File not found: ${filePath}`],
      })
      return
    }

    sections.forEach((section) => {
      const { linesToRemove, contextLines } = section
      const searchString = [...contextLines, ...linesToRemove].join(
        '\n',
      )
      const replaceString = [
        ...contextLines,
        ...section.linesToAdd,
      ].join('\n')

      if (!originalContent.includes(searchString)) {
        results.push({
          isValid: false,
          errors: [
            'Patch context does not match original file content',
          ],
          searchString,
          replaceString,
          originalContent,
        })
      } else {
        results.push({
          isValid: true,
          searchString,
          replaceString,
          originalContent,
        })
      }
    })
  })

  return results
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
): PatchValidationResult[] {
  const patchData = parsePatchFile(patchFile)
  const results: PatchValidationResult[] = []

  patchData.forEach(({ filePath, sections }) => {
    const originalContent = fileContents[filePath]

    if (!originalContent) {
      results.push({
        isValid: false,
        errors: [`File not found: ${filePath}`],
      })
      return
    }

    sections.forEach((section) => {
      const { linesToRemove, contextLines } = section
      const searchString = [...contextLines, ...linesToRemove].join(
        '\n',
      )
      // const searchString = linesToRemove.join('\n')
      const replaceString = [
        ...contextLines,
        ...section.linesToAdd,
      ].join('\n')

      if (!originalContent.includes(searchString)) {
        // console.log('Invalid patch')
        // console.log(
        //   'Original Content:',
        //   wrapWithPoundSymbols(originalContent),
        // )
        // console.log('Patch', wrapWithPoundSymbols(patchFile))
        // console.log(
        //   'Search String:',
        //   wrapWithPoundSymbols(searchString),
        // )
        // console.log(
        //   'Replace String:',
        //   wrapWithPoundSymbols(replaceString),
        // )
        results.push({
          isValid: false,
          errors: [
            'Patch context does not match original file content',
          ],
          searchString,
          replaceString,
          originalContent,
        })
      } else {
        results.push({
          isValid: true,
          searchString,
          replaceString,
        })
      }
    })
  })

  return results
}

export { validatePatch }

export type { FileContents, PatchFile, PatchValidationResult }
