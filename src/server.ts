import express from 'express'
import dotenv from 'dotenv'
import { logger } from './logging.ts'

dotenv.config()
logger.info('Server started and logger initialized.')

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

// Virtual file system
const fileSystem = {
  'src/main.rs': `
use std::collections::HashMap;

// Main function
fn main() {
    let mut map = HashMap::new();
    map.insert("key1", "value1");
    map.insert("key2", "value2");

    // Iterate over the map
    for (key, value) in &map {
        println!("{}: {}", key, value);
    }
}`,
  'lib/utils.ts': `
/**
 * Debounce function
 */
export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => func(...args), waitFor);
    };
}

// Capitalize the first letter of a string
export function capitalizeString(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}`,
  'config.json': `{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project configuration",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.17.1",
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "jest": "^27.0.6",
    "typescript": "^4.3.5"
  }
}`,
  'docker-compose.yml': `
version: '3'
services:
  web:
    build: .
    ports:
      - "5000:5000"
  redis:
    image: "redis:alpine"
  db:
    image: "postgres:13"
    environment:
      POSTGRES_PASSWORD: example
volumes:
  db-data:`,
}

// Test cases
const testCases = [
  {
    description: 'Rust file with comments',
    searches: {
      'src/main.rs': [
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
    },
    expectedResult: {
      'src/main.rs': {
        fileName: 'src/main.rs',
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
      },
    },
  },
  // Add more test cases here as needed
]

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.get('/fileSystem', (req, res) => {
  logger.info('File system endpoint was called')
  res.json(fileSystem)
})

app.get('/testCases', (req, res) => {
  logger.info('Test cases endpoint was called')
  res.json(testCases)
})

const port = 3000
app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
