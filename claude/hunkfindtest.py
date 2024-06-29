import os
from typing import Dict, List, Union, TypedDict
import unittest

# Type definitions
FileSystem = Dict[str, str]

class HunkMatch(TypedDict):
    hunkLineNum: int
    fileLineNum: int
    content: str

class HunkResult(TypedDict):
    matches: List[HunkMatch]
    mismatches: List[Dict[str, Union[int, str]]]
    hunkLines: int
    matchPercentage: float
    errors: List[str]

class FileResult(TypedDict):
    fileName: str
    fileLines: int
    hunks: List[HunkResult]

class ErrorResult(TypedDict):
    error: str
    hunks: List[Dict[str, Union[int, float]]]

SearchResult = Dict[str, Union[FileResult, ErrorResult]]

def compare_hunks_to_files(searches: Dict[str, List[List[str]]], file_system: FileSystem) -> SearchResult:
    results: SearchResult = {}

    for file_name, hunks in searches.items():
        if file_name not in file_system:
            results[file_name] = {
                "error": f'File "{file_name}" not found in the file system.',
                "hunks": [{"hunkLines": len(hunk[0].split('\n')), "matchPercentage": 0} for hunk in hunks]
            }
            continue

        file = file_system[file_name].split('\n')
        non_empty_lines = [(line.strip(), index + 1) for index, line in enumerate(file) if line.strip()]

        file_result: FileResult = {
            "fileName": file_name,
            "fileLines": len(file),
            "hunks": []
        }

        for hunk in hunks:
            hunk_lines = [line for line in hunk[0].split('\n') if line.strip()]
            hunk_result: HunkResult = {
                "matches": [],
                "mismatches": [],
                "hunkLines": len(hunk_lines),
                "matchPercentage": 0,
                "errors": []
            }

            for hunk_line_index, hunk_line in enumerate(hunk_lines):
                file_index = next((i for i, (line, _) in enumerate(non_empty_lines) if line == hunk_line.strip()), -1)
                if file_index != -1:
                    hunk_result["matches"].append({
                        "hunkLineNum": hunk_line_index + 1,
                        "fileLineNum": non_empty_lines[file_index][1],
                        "content": hunk_line.strip()
                    })
                else:
                    hunk_result["mismatches"].append({
                        "hunkLineNum": hunk_line_index + 1,
                        "content": hunk_line.strip()
                    })
                    hunk_result["errors"].append(
                        f'Line {hunk_line_index + 1} of hunk not found in {file_name}: "{hunk_line.strip()}"'
                    )

            hunk_result["matchPercentage"] = (len(hunk_result["matches"]) / len(hunk_lines)) * 100
            file_result["hunks"].append(hunk_result)

        results[file_name] = file_result

    return results

def read_test_files(test_dir: str) -> FileSystem:
    file_system: FileSystem = {}
    for file in os.listdir(test_dir):
        file_path = os.path.join(test_dir, file)
        if os.path.isfile(file_path):
            with open(file_path, 'r') as f:
                file_system[file] = f.read()
    return file_system

# Read the test files
test_dir = os.path.join(os.path.dirname(__file__), 'test_files')
file_system = read_test_files(test_dir)

class TestFileComparison(unittest.TestCase):
    def test_rust_file_with_comments(self):
        searches = {
            'main.rs': [
                [
                    """// Main function
fn main() {
    let mut map = HashMap::new();"""
                ],
                [
                    """// Iterate over the map
    for (key, value) in &map {
        println!("{}: {}", key, value);"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['main.rs'], {
            "fileName": "main.rs",
            "fileLines": 14,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 3,
                            "content": "// Main function"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 4,
                            "content": "fn main() {"
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 5,
                            "content": "let mut map = HashMap::new();"
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 3,
                    "matchPercentage": 100,
                    "errors": []
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 9,
                            "content": "// Iterate over the map"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 10,
                            "content": "for (key, value) in &map {"
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 11,
                            "content": 'println!("{}: {}", key, value);'
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 3,
                    "matchPercentage": 100,
                    "errors": []
                }
            ]
        })

    def test_typescript_file_with_multi_line_function(self):
        searches = {
            'utils.ts': [
                [
                    """export function debounce<F extends (...args: any[]) => any>(
    func: F,
    waitFor: number,
) {
    let timeout: ReturnType<typeof setTimeout> | null = null"""
                ],
                [
                    """export function capitalizeString(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
}"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['utils.ts'], {
            "fileName": "utils.ts",
            "fileLines": 22,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 4,
                            "content": "export function debounce<F extends (...args: any[]) => any>("
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 5,
                            "content": "func: F,"
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 6,
                            "content": "waitFor: number,"
                        },
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 7,
                            "content": ") {"
                        },
                        {
                            "hunkLineNum": 5,
                            "fileLineNum": 8,
                            "content": "let timeout: ReturnType<typeof setTimeout> | null = null"
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 5,
                    "matchPercentage": 100,
                    "errors": []
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 19,
                            "content": "export function capitalizeString(str: string): string {"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 20,
                            "content": "return str.charAt(0).toUpperCase() + str.slice(1)"
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 13,
                            "content": "}"
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 3,
                    "matchPercentage": 100,
                    "errors": []
                }
            ]
        })

    def test_json_file(self):
        searches = {
            'config.json': [
                [
                    """{
  "name": "my-project",
  "version": "1.0.0",
  "description": "A sample project configuration","""
                ],
                [
                    """"devDependencies": {
    "jest": "^27.0.6",
    "typescript": "^4.3.5"
  }"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['config.json'], {
            "fileName": "config.json",
            "fileLines": 19,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 1,
                            "content": "{"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 2,
                            "content": '"name": "my-project",'
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 3,
                            "content": '"version": "1.0.0",'
                        },
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 4,
                            "content": '"description": "A sample project configuration",'
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 4,
                    "matchPercentage": 100,
                    "errors": []
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 14,
                            "content": '"devDependencies": {'
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 15,
                            "content": '"jest": "^27.0.6",'
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 16,
                            "content": '"typescript": "^4.3.5"'
                        },
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 17,
                            "content": "}"
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 4,
                    "matchPercentage": 100,
                    "errors": []
                }
            ]
        })

    def test_yaml_file(self):
        searches = {
            'docker-compose.yml': [
                [
                    """version: '3'
services:
  web:
    build: .
    ports:
      - "5000:5000\""""
                ],
                [
                    """db:
    image: "postgres:13"
    environment:
      POSTGRES_PASSWORD: example
volumes:
  db-data:"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['docker-compose.yml'], {
            "fileName": "docker-compose.yml",
            "fileLines": 15,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 1,
                            "content": "version: '3'"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 2,
                            "content": "services:"
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 3,
                            "content": "web:"
                        },
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 4,
                            "content": "build: ."
                        },
                        {
                            "hunkLineNum": 5,
                            "fileLineNum": 5,
                            "content": "ports:"
                        },
                        {
                            "hunkLineNum": 6,
                            "fileLineNum": 6,
                            "content": '- "5000:5000"'
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 6,
                    "matchPercentage": 100,
                    "errors": []
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 9,
                            "content": "db:"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 10,
                            "content": 'image: "postgres:13"'
                        },
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 11,
                            "content": "environment:"
                        },
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 12,
                            "content": "POSTGRES_PASSWORD: example"
                        },
                        {
                            "hunkLineNum": 5,
                            "fileLineNum": 13,
                            "content": "volumes:"
                        },
                        {
                            "hunkLineNum": 6,
                            "fileLineNum": 14,
                            "content": "db-data:"
                        }
                    ],
                    "mismatches": [],
                    "hunkLines": 6,
                    "matchPercentage": 100,
                    "errors": []
                }
            ]
        })

    def test_non_existent_file(self):
        searches = {
            'non_existent.rs': [["This file does not exist"]]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['non_existent.rs'], {
            "error": 'File "non_existent.rs" not found in the file system.',
            "hunks": [{"hunkLines": 1, "matchPercentage": 0}]
        })

class TestFileComparisonPartialMatches(unittest.TestCase):
    maxDiff = None
    def test_rust_file_with_similar_but_not_exact_content(self):
        searches = {
            'main.rs': [
                [
                    """// Main function
fn main() {
    let my_map = HashMap::new();
    my_map.insert("key1", "value1");"""
                ],
                [
                    """// Loop through the map
    for (k, v) in &my_map {
        println!("{}={}", k, v);"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['main.rs'], {
            "fileName": "main.rs",
            "fileLines": 14,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 3,
                            "content": "// Main function"
                        },
                        {
                            "hunkLineNum": 2,
                            "fileLineNum": 4,
                            "content": "fn main() {"
                        },
                    ],
                    "mismatches": [
                        {
                            "hunkLineNum": 3,
                            "content": "let my_map = HashMap::new();"
                        },
                        {
                            "hunkLineNum": 4,
                            "content": 'my_map.insert("key1", "value1");'
                        },
                    ],
                    "hunkLines": 4,
                    "matchPercentage": 50,
                    "errors": [
                        'Line 3 of hunk not found in main.rs: "let my_map = HashMap::new();"',
                        'Line 4 of hunk not found in main.rs: "my_map.insert("key1", "value1");"'
                    ]
                },
                {
                    "matches": [],
                    "mismatches": [
                        {
                            "hunkLineNum": 1,
                            "content": "// Loop through the map"
                        },
                        {
                            "hunkLineNum": 2,
                            "content": "for (k, v) in &my_map {"
                        },
                        {
                            "hunkLineNum": 3,
                            "content": 'println!("{}={}", k, v);'
                        },
                    ],
                    "hunkLines": 3,
                    "matchPercentage": 0,
                    "errors": [
                        'Line 1 of hunk not found in main.rs: "// Loop through the map"',
                        'Line 2 of hunk not found in main.rs: "for (k, v) in &my_map {"',
                        'Line 3 of hunk not found in main.rs: "println!("{}={}", k, v);"'
                    ]
                }
            ]
        })

    def test_typescript_file_with_partial_matches_and_similar_functions(self):
        searches = {
            'utils.ts': [
                [
                    """export function debounce<T extends Function>(
    func: T,
    delay: number
) {
    let timer: NodeJS.Timeout | null = null;"""
                ],
                [
                    """export function capitalize(str: string): string {
    return str[0].toUpperCase() + str.substring(1);
}"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['utils.ts'], {
            "fileName": "utils.ts",
            "fileLines": 22,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 4,
                            "fileLineNum": 7,
                            "content": ") {"
                        },
                    ],
                    "mismatches": [
                        {
                            "hunkLineNum": 1,
                            "content": "export function debounce<T extends Function>("
                        },
                        {
                            "hunkLineNum": 2,
                            "content": "func: T,"
                        },
                        {
                            "hunkLineNum": 3,
                            "content": "delay: number"
                        },
                        {
                            "hunkLineNum": 5,
                            "content": "let timer: NodeJS.Timeout | null = null;"
                        },
                    ],
                    "hunkLines": 5,
                    "matchPercentage": 20,
                    "errors": [
                        'Line 1 of hunk not found in utils.ts: "export function debounce<T extends Function>("',
                        'Line 2 of hunk not found in utils.ts: "func: T,"',
                        'Line 3 of hunk not found in utils.ts: "delay: number"',
                        'Line 5 of hunk not found in utils.ts: "let timer: NodeJS.Timeout | null = null;"'
                    ]
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 3,
                            "fileLineNum": 13,
                            "content": "}"
                        },
                    ],
                    "mismatches": [
                        {
                            "hunkLineNum": 1,
                            "content": "export function capitalize(str: string): string {"
                        },
                        {
                            "hunkLineNum": 2,
                            "content": "return str[0].toUpperCase() + str.substring(1);"
                        },
                    ],
                    "hunkLines": 3,
                    "matchPercentage": 33.33333333333333,
                    "errors": [
                        'Line 1 of hunk not found in utils.ts: "export function capitalize(str: string): string {"',
                        'Line 2 of hunk not found in utils.ts: "return str[0].toUpperCase() + str.substring(1);"'
                    ]
                }
            ]
        })

    def test_json_file_with_partial_configuration_matches(self):
        searches = {
            'config.json': [
                [
                    """{
  "name": "my-awesome-project",
  "version": "2.0.0",
  "description": "An awesome project configuration","""
                ],
                [
                    """"devDependencies": {
    "jest": "^28.0.0",
    "typescript": "^4.4.0",
    "eslint": "^8.0.0"
  }"""
                ]
            ]
        }

        result = compare_hunks_to_files(searches, file_system)
        self.assertEqual(result['config.json'], {
            "fileName": "config.json",
            "fileLines": 19,
            "hunks": [
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 1,
                            "content": "{"
                        }
                    ],
                    "mismatches": [
                        {
                            "hunkLineNum": 2,
                            "content": '"name": "my-awesome-project",'
                        },
                        {
                            "hunkLineNum": 3,
                            "content": '"version": "2.0.0",'
                        },
                        {
                            "hunkLineNum": 4,
                            "content": '"description": "An awesome project configuration",'
                        },
                    ],
                    "hunkLines": 4,
                    "matchPercentage": 25,
                    "errors": [
                        'Line 2 of hunk not found in config.json: ""name": "my-awesome-project","',
                        'Line 3 of hunk not found in config.json: ""version": "2.0.0","',
                        'Line 4 of hunk not found in config.json: ""description": "An awesome project configuration","'
                    ]
                },
                {
                    "matches": [
                        {
                            "hunkLineNum": 1,
                            "fileLineNum": 14,
                            "content": '"devDependencies": {'
                        },
                        {
                            "hunkLineNum": 5,
                            "fileLineNum": 17,
                            "content": "}"
                        },
                    ],
                    "mismatches": [
                        {
                            "hunkLineNum": 2,
                            "content": '"jest": "^28.0.0",'
                        },
                        {
                            "hunkLineNum": 3,
                            "content": '"typescript": "^4.4.0",'
                        },
                        {
                            "hunkLineNum": 4,
                            "content": '"eslint": "^8.0.0"'
                        },
                    ],
                    "hunkLines": 5,
                    "matchPercentage": 40,
                    "errors": [
                        'Line 2 of hunk not found in config.json: ""jest": "^28.0.0","',
                        'Line 3 of hunk not found in config.json: ""typescript": "^4.4.0","',
                        'Line 4 of hunk not found in config.json: ""eslint": "^8.0.0""'
                    ]
                }
            ]
        })

if __name__ == '__main__':
    unittest.main()
