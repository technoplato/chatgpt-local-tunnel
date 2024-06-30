import unittest
import os
import sys
import json
from io import StringIO
from unittest.mock import patch, mock_open

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search import compare_hunks_to_files, replace_hunks_in_files, read_file, write_file

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

    def test_replace_hunks(self):
        file_content = """fn main() {
    let x = 5;
    println!("x is: {}", x);
}"""
        file_system = {"test.rs": file_content}
        searches = {
            "test.rs": [
                ["let x = 5;"]
            ]
        }
        replacements = {
            "test.rs": [
                ["let x = 10;"]
            ]
        }

        search_results, updated_files = replace_hunks_in_files(searches, replacements, file_system)

        expected_content = """fn main() {
    let x = 10;
    println!("x is: {}", x);
}"""
        self.assertEqual(updated_files["test.rs"], expected_content)
        self.assertEqual(search_results["test.rs"]["hunks"][0]["matchPercentage"], 100)

    def test_replace_hunks_with_errors(self):
        file_content = """fn main() {
    let x = 5;
    println!("x is: {}", x);
}"""
        file_system = {"test.rs": file_content}
        searches = {
            "test.rs": [
                ["let y = 5;"]
            ]
        }
        replacements = {
            "test.rs": [
                ["let y = 10;"]
            ]
        }

        search_results, updated_files = replace_hunks_in_files(searches, replacements, file_system)

        self.assertEqual(updated_files["test.rs"], file_content)  # No changes should be made
        self.assertEqual(search_results["test.rs"]["hunks"][0]["matchPercentage"], 0)
        self.assertGreater(len(search_results["test.rs"]["hunks"][0]["errors"]), 0)

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function_search(self, mock_stdout):
        test_file = os.path.join(self.test_dir, 'main.rs')
        test_hunk = "fn main() {"
        sys.argv = ['hunk_search.py', test_file, test_hunk]

        from hunk_search import main
        main()

        output = mock_stdout.getvalue()
        result = json.loads(output)

        self.assertIn(test_file, result)
        self.assertEqual(result[test_file]['hunks'][0]['matches'][0]['content'], "fn main() {")

    @patch('sys.stdout', new_callable=StringIO)
    @patch('hunk_search.write_file')
    def test_main_function_replace(self, mock_write_file, mock_stdout):
        test_file = os.path.join(self.test_dir, 'main.rs')
        test_hunk = "fn main() {"
        replacement_hunk = "fn modified_main() {"
        sys.argv = ['hunk_search.py', test_file, test_hunk, '--replace', replacement_hunk]

        from hunk_search import main
        main()

        output = mock_stdout.getvalue()
        self.assertIn("Replacement successful", output)

        mock_write_file.assert_called_once()
        written_content = mock_write_file.call_args[0][1]
        self.assertIn("fn modified_main() {", written_content)

if __name__ == '__main__':
    unittest.main()
