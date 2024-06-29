import unittest
import os
import sys
import json
from io import StringIO
from unittest.mock import patch

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search import compare_hunks_to_files, read_file

class TestHunkSearch(unittest.TestCase):
    def setUp(self):
        # Update the path to test_files
        self.test_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'test_files')
        self.file_system = {
            f: read_file(os.path.join(self.test_dir, f))
            for f in os.listdir(self.test_dir)
            if os.path.isfile(os.path.join(self.test_dir, f))
        }

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

        result = compare_hunks_to_files(searches, self.file_system)
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

    def test_non_existent_file(self):
        searches = {
            'non_existent.rs': [["This file does not exist"]]
        }

        result = compare_hunks_to_files(searches, self.file_system)
        self.assertEqual(result['non_existent.rs'], {
            "error": 'File "non_existent.rs" not found in the file system.',
            "hunks": [{"hunkLines": 1, "matchPercentage": 0}]
        })

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function(self, mock_stdout):
        test_file = os.path.join(self.test_dir, 'main.rs')
        test_hunk = "fn main() {"
        sys.argv = ['hunk_search.py', test_file, test_hunk]
        
        from hunk_search import main
        main()
        
        output = mock_stdout.getvalue()
        result = json.loads(output)
        
        self.assertIn(test_file, result)
        self.assertEqual(result[test_file]['hunks'][0]['matches'][0]['content'], "fn main() {")

if __name__ == '__main__':
    unittest.main()