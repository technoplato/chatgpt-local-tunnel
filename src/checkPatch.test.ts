import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { envParsedWithTypes } from '../ENV/env.config.ts'
import { logger } from './logging.ts'

// Function to check if the chunk exists in the file and identify the first missing line
const firstMissingLineInChunk = (
  filePath: string,
  chunk: string,
): string | null => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const chunkLines = chunk
    .trim()
    .split('\n')
    .map((line) => line.trim())

  for (let line of chunkLines) {
    if (!content.includes(line)) {
      return line
    }
  }
  return null
}

describe('Checking if a chunk  exists in a file', () => {
  it('should return the first missing line if the chunk is not found', () => {
    const filePath = path.join(__dirname, 'routes/runCommand.ts')
    const existingChunk = `
      if (
        !fs.existsSync(envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION)
      ) {
        logger.error('External project path does not exist', {
          path: envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION,
        })
        return res 
          .status(400)
          .json({ error: 'External project path does not exist' })
      }`
    const chunkToSearch = existingChunk
    const missingLine = firstMissingLineInChunk(
      filePath,
      chunkToSearch,
    )
    expect(missingLine).toBe(null)
  })
})
