import { describe, expect, test } from 'bun:test'
import * as fs from 'fs'
import * as path from 'path'

// Type definitions
type FileSystem = { [key: string]: string }
type HunkMatch = {
  hunkLineNum: number
  fileLineNum: number
  content: string
}
type HunkResult = {
  matches: HunkMatch[]
  mismatches: { hunkLineNum: number; content: string }[]
  hunkLines: number
  matchPercentage: number
  errors: string[]
}
type FileResult = {
  fileName: string
  fileLines: number
  hunks: HunkResult[]
}
type SearchResult = {
  [key: string]:
    | FileResult
    | {
        error: string
        hunks: { hunkLines: number; matchPercentage: number }[]
      }
}

// Main function
function compareHunksToFiles(
  searches: { [key: string]: string[][] },
  fileSystem: FileSystem,
): SearchResult {
  const results: SearchResult = {}

  for (const [fileName, hunks] of Object.entries(searches)) {
    if (!fileSystem.hasOwnProperty(fileName)) {
      results[fileName] = {
        error: `File "${fileName}" not found in the file system.`,
        hunks: hunks.map((hunk) => ({
          hunkLines: hunk[0]
            .split('\n')
            .filter((line) => line.trim() !== '').length,
          matchPercentage: 0,
        })),
      }
      continue
    }

    const file = fileSystem[fileName].split('\n')
    const nonEmptyLines = file
      .map((line, index) => ({
        line: line.trim(),
        actualLineNum: index + 1,
      }))
      .filter(({ line }) => line !== '')

    results[fileName] = {
      fileName,
      fileLines: file.length,
      hunks: hunks.map((hunk) => {
        const hunkLines = hunk[0]
          .split('\n')
          .filter((line) => line.trim() !== '')
        const hunkResult: HunkResult = {
          matches: [],
          mismatches: [],
          hunkLines: hunkLines.length,
          matchPercentage: 0,
          errors: [],
        }

        hunkLines.forEach((hunkLine, hunkLineIndex) => {
          const fileIndex = nonEmptyLines.findIndex(
            ({ line }) => line === hunkLine.trim(),
          )
          if (fileIndex !== -1) {
            hunkResult.matches.push({
              hunkLineNum: hunkLineIndex + 1,
              fileLineNum: nonEmptyLines[fileIndex].actualLineNum,
              content: hunkLine.trim(),
            })
          } else {
            hunkResult.mismatches.push({
              hunkLineNum: hunkLineIndex + 1,
              content: hunkLine.trim(),
            })
            hunkResult.errors.push(
              `Line ${hunkLineIndex + 1} of hunk not found in ${fileName}: "${hunkLine.trim()}"`,
            )
          }
        })

        hunkResult.matchPercentage =
          (hunkResult.matches.length / hunkLines.length) * 100
        return hunkResult
      }),
    }
  }

  return results
}

// Function to read files from the test directory
function readTestFiles(testDir: string): FileSystem {
  const fileSystem: FileSystem = {}
  const files = fs.readdirSync(testDir)
  console.log('flies', { files })

  files.forEach((file) => {
    const filePath = path.join(testDir, file)
    if (fs.statSync(filePath).isFile()) {
      fileSystem[file] = fs.readFileSync(filePath, 'utf-8')
    }
  })

  return fileSystem
}

// Read the test files
const testDir = path.join(__dirname, 'test_files')
console.log({ testDir })
const fileSystem = readTestFiles(testDir)

// Tests
describe('File Comparison Tests', () => {
  test('Rust file with comments', () => {
    const searches = {
      'main.rs': [
        [
          `// Main function
fn main() {
    let mut map = HashMap::new();`,
        ],
        [
          `// Iterate over the map
    for (key, value) in &map {
        println!("{}: {}", key, value);`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['main.rs']).toEqual({
      fileName: 'main.rs',
      fileLines: 14,
      hunks: [
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 4,
              content: '// Main function',
            },
            {
              hunkLineNum: 2,
              fileLineNum: 5,
              content: 'fn main() {',
            },
            {
              hunkLineNum: 3,
              fileLineNum: 6,
              content: 'let mut map = HashMap::new();',
            },
          ],
          mismatches: [],
          hunkLines: 3,
          matchPercentage: 100,
          errors: [],
        },
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 10,
              content: '// Iterate over the map',
            },
            {
              hunkLineNum: 2,
              fileLineNum: 11,
              content: 'for (key, value) in &map {',
            },
            {
              hunkLineNum: 3,
              fileLineNum: 12,
              content: 'println!("{}: {}", key, value);',
            },
          ],
          mismatches: [],
          hunkLines: 3,
          matchPercentage: 100,
          errors: [],
        },
      ],
    })
  })

  test.only('TypeScript file with multi-line function', () => {
    const searches = {
      'utils.ts': [
        [
          `export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number,
) {
    let timeout: ReturnType<typeof setTimeout> | null = null`,
        ],
        [
          `export function capitalizeString(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['utils.ts']).toEqual({
      fileName: 'utils.ts',
      fileLines: 22,
      hunks: [
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 4,
              content:
                'export function debounce<F extends (...args: any[]) => any>(',
            },
            { hunkLineNum: 2, fileLineNum: 5, content: 'func: F,' },
            {
              hunkLineNum: 3,
              fileLineNum: 6,
              content: 'waitFor: number,',
            },
            { hunkLineNum: 4, fileLineNum: 7, content: ') {' },
            {
              hunkLineNum: 5,
              fileLineNum: 8,
              content:
                'let timeout: ReturnType<typeof setTimeout> | null = null',
            },
          ],
          mismatches: [],
          hunkLines: 5,
          matchPercentage: 100,
          errors: [],
        },
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 19,
              content:
                'export function capitalizeString(str: string): string {',
            },
            {
              hunkLineNum: 2,
              fileLineNum: 20,
              content:
                'return str.charAt(0).toUpperCase() + str.slice(1)',
            },
            { hunkLineNum: 3, fileLineNum: 13, content: '}' },
          ],
          mismatches: [],
          hunkLines: 3,
          matchPercentage: 100,
          errors: [],
        },
      ],
    })
  })

  test('JSON file', () => {
    const searches = {
      'config.json': [
        [
          `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project configuration",`,
        ],
        [
          `"devDependencies": {
    "jest": "^27.0.6",
    "typescript": "^4.3.5"
  }`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['config.json']).toEqual({
      fileName: 'config.json',
      fileLines: 19,
      hunks: [
        {
          matches: [
            { hunkLineNum: 1, fileLineNum: 1, content: '{' },
            {
              hunkLineNum: 2,
              fileLineNum: 2,
              content: '"name": "my-project",',
            },
            {
              hunkLineNum: 3,
              fileLineNum: 3,
              content: '"version": "1.0.0",',
            },
            {
              hunkLineNum: 4,
              fileLineNum: 4,
              content:
                '"description": "A sample project configuration",',
            },
          ],
          mismatches: [],
          hunkLines: 4,
          matchPercentage: 100,
          errors: [],
        },
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 14,
              content: '"devDependencies": {',
            },
            {
              hunkLineNum: 2,
              fileLineNum: 15,
              content: '"jest": "^27.0.6",',
            },
            {
              hunkLineNum: 3,
              fileLineNum: 16,
              content: '"typescript": "^4.3.5"',
            },
            { hunkLineNum: 4, fileLineNum: 17, content: '}' },
          ],
          mismatches: [],
          hunkLines: 4,
          matchPercentage: 100,
          errors: [],
        },
      ],
    })
  })

  test('YAML file', () => {
    const searches = {
      'docker-compose.yml': [
        [
          `version: '3'
services:
  web:
    build: .
    ports:
      - "5000:5000"`,
        ],
        [
          `db:
    image: "postgres:13"
    environment:
      POSTGRES_PASSWORD: example
volumes:
  db-data:`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['docker-compose.yml']).toEqual({
      fileName: 'docker-compose.yml',
      fileLines: 15,
      hunks: [
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 1,
              content: "version: '3'",
            },
            { hunkLineNum: 2, fileLineNum: 2, content: 'services:' },
            { hunkLineNum: 3, fileLineNum: 3, content: 'web:' },
            { hunkLineNum: 4, fileLineNum: 4, content: 'build: .' },
            { hunkLineNum: 5, fileLineNum: 5, content: 'ports:' },
            {
              hunkLineNum: 6,
              fileLineNum: 6,
              content: '- "5000:5000"',
            },
          ],
          mismatches: [],
          hunkLines: 6,
          matchPercentage: 100,
          errors: [],
        },
        {
          matches: [
            { hunkLineNum: 1, fileLineNum: 9, content: 'db:' },
            {
              hunkLineNum: 2,
              fileLineNum: 10,
              content: 'image: "postgres:13"',
            },
            {
              hunkLineNum: 3,
              fileLineNum: 11,
              content: 'environment:',
            },
            {
              hunkLineNum: 4,
              fileLineNum: 12,
              content: 'POSTGRES_PASSWORD: example',
            },
            { hunkLineNum: 5, fileLineNum: 13, content: 'volumes:' },
            { hunkLineNum: 6, fileLineNum: 14, content: 'db-data:' },
          ],
          mismatches: [],
          hunkLines: 6,
          matchPercentage: 100,
          errors: [],
        },
      ],
    })
  })

  test('Non-existent file', () => {
    const searches = {
      'non_existent.rs': [[`This file does not exist`]],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['non_existent.rs']).toEqual({
      error: 'File "non_existent.rs" not found in the file system.',
      hunks: [{ hunkLines: 1, matchPercentage: 0 }],
    })
  })
})

describe('File Comparison Tests - Partial Matches and Similar Content', () => {
  test('Rust file with similar but not exact content', () => {
    const searches = {
      'main.rs': [
        [
          `// Main function
fn main() {
    let my_map = HashMap::new();
    my_map.insert("key1", "value1");`,
        ],
        [
          `// Loop through the map
    for (k, v) in &my_map {
        println!("{}={}", k, v);`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['main.rs']).toEqual({
      fileName: 'main.rs',
      fileLines: 14,
      hunks: [
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 3,
              content: '// Main function',
            },
            {
              hunkLineNum: 2,
              fileLineNum: 4,
              content: 'fn main() {',
            },
          ],
          mismatches: [
            {
              hunkLineNum: 3,
              content: 'let my_map = HashMap::new();',
            },
            {
              hunkLineNum: 4,
              content: 'my_map.insert("key1", "value1");',
            },
          ],
          hunkLines: 4,
          matchPercentage: 50,
          errors: [
            'Line 3 of hunk not found in main.rs: "let my_map = HashMap::new();"',
            'Line 4 of hunk not found in main.rs: "my_map.insert("key1", "value1");"',
          ],
        },
        {
          matches: [],
          mismatches: [
            {
              hunkLineNum: 1,
              content: '// Loop through the map',
            },
            {
              hunkLineNum: 2,
              content: 'for (k, v) in &my_map {',
            },
            {
              hunkLineNum: 3,
              content: 'println!("{}={}", k, v);',
            },
          ],
          hunkLines: 3,
          matchPercentage: 0,
          errors: [
            'Line 1 of hunk not found in main.rs: "// Loop through the map"',
            'Line 2 of hunk not found in main.rs: "for (k, v) in &my_map {"',
            'Line 3 of hunk not found in main.rs: "println!("{}={}", k, v);"',
          ],
        },
      ],
    })
  })

  test('TypeScript file with partial matches and similar functions', () => {
    const searches = {
      'utils.ts': [
        [
          `export function debounce<T extends Function>(
    func: T,
    delay: number
) {
    let timer: NodeJS.Timeout | null = null;`,
        ],
        [
          `export function capitalize(str: string): string {
    return str[0].toUpperCase() + str.substring(1);
}`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['utils.ts']).toEqual({
      fileName: 'utils.ts',
      fileLines: 22,
      hunks: [
        {
          matches: [
            {
              hunkLineNum: 4,
              fileLineNum: 7,
              content: ') {',
            },
          ],
          mismatches: [
            {
              hunkLineNum: 1,
              content:
                'export function debounce<T extends Function>(',
            },
            {
              hunkLineNum: 2,
              content: 'func: T,',
            },
            {
              hunkLineNum: 3,
              content: 'delay: number',
            },
            {
              hunkLineNum: 5,
              content: 'let timer: NodeJS.Timeout | null = null;',
            },
          ],
          hunkLines: 5,
          matchPercentage: 20,
          errors: [
            'Line 1 of hunk not found in utils.ts: "export function debounce<T extends Function>("',
            'Line 2 of hunk not found in utils.ts: "func: T,"',
            'Line 3 of hunk not found in utils.ts: "delay: number"',
            'Line 5 of hunk not found in utils.ts: "let timer: NodeJS.Timeout | null = null;"',
          ],
        },
        {
          matches: [
            {
              hunkLineNum: 3,
              fileLineNum: 13,
              content: '}',
            },
          ],
          mismatches: [
            {
              hunkLineNum: 1,
              content:
                'export function capitalize(str: string): string {',
            },
            {
              hunkLineNum: 2,
              content:
                'return str[0].toUpperCase() + str.substring(1);',
            },
          ],
          hunkLines: 3,
          matchPercentage: 33.33333333333333,
          errors: [
            'Line 1 of hunk not found in utils.ts: "export function capitalize(str: string): string {"',
            'Line 2 of hunk not found in utils.ts: "return str[0].toUpperCase() + str.substring(1);"',
          ],
        },
      ],
    })
  })

  test('JSON file with partial configuration matches', () => {
    const searches = {
      'config.json': [
        [
          `{
  "name": "my-awesome-project",
  "version": "2.0.0",
  "description": "An awesome project configuration",`,
        ],
        [
          `"devDependencies": {
    "jest": "^28.0.0",
    "typescript": "^4.4.0",
    "eslint": "^8.0.0"
  }`,
        ],
      ],
    }

    const result = compareHunksToFiles(searches, fileSystem)
    expect(result['config.json']).toEqual({
      fileName: 'config.json',
      fileLines: 19,
      hunks: [
        {
          matches: [{ hunkLineNum: 1, fileLineNum: 1, content: '{' }],
          mismatches: [
            {
              hunkLineNum: 2,
              content: '"name": "my-awesome-project",',
            },
            {
              hunkLineNum: 3,
              content: '"version": "2.0.0",',
            },
            {
              hunkLineNum: 4,
              content:
                '"description": "An awesome project configuration",',
            },
          ],
          hunkLines: 4,
          matchPercentage: 25,
          errors: [
            'Line 2 of hunk not found in config.json: ""name": "my-awesome-project","',
            'Line 3 of hunk not found in config.json: ""version": "2.0.0","',
            'Line 4 of hunk not found in config.json: ""description": "An awesome project configuration","',
          ],
        },
        {
          matches: [
            {
              hunkLineNum: 1,
              fileLineNum: 14,
              content: '"devDependencies": {',
            },
            {
              hunkLineNum: 5,
              fileLineNum: 17,
              content: '}',
            },
          ],
          mismatches: [
            {
              hunkLineNum: 2,
              content: '"jest": "^28.0.0",',
            },
            {
              hunkLineNum: 3,
              content: '"typescript": "^4.4.0",',
            },
            {
              hunkLineNum: 4,
              content: '"eslint": "^8.0.0"',
            },
          ],
          hunkLines: 5,
          matchPercentage: 40,
          errors: [
            'Line 2 of hunk not found in config.json: ""jest": "^28.0.0","',
            'Line 3 of hunk not found in config.json: ""typescript": "^4.4.0","',
            'Line 4 of hunk not found in config.json: ""eslint": "^8.0.0""',
          ],
        },
      ],
    })
  })
})
