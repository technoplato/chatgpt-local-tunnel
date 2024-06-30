import unittest
import os
import sys
import json
import base64
from io import StringIO
from unittest.mock import patch, mock_open, MagicMock

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search_and_replace import compare_hunks_to_files, replace_hunks_in_files, read_file, write_file, create_backup, create_patch, create_base64_patch, find_common_ancestor

class TestHunkSearch(unittest.TestCase):
    def setUp(self):
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

    @patch('hunk_search_and_replace.create_backup')
    @patch('hunk_search_and_replace.create_patch')
    @patch('hunk_search_and_replace.open', new_callable=mock_open)
    def test_replace_hunks(self, mock_open, mock_create_patch, mock_create_backup):
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

        mock_create_backup.return_value = "test.rs.old"
        mock_create_patch.return_value = "mock patch content"

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(searches, replacements, file_system)

        expected_content = """fn main() {
    let x = 10;
    println!("x is: {}", x);
}"""
        self.assertEqual(updated_files["test.rs"], expected_content)
        self.assertEqual(search_results["test.rs"]["hunks"][0]["matchPercentage"], 100)
        self.assertEqual(backup_files["test.rs"], "test.rs.old")
        mock_create_backup.assert_called_once_with("test.rs")
        mock_create_patch.assert_called_once_with("test.rs.old", "test.rs")

    @patch('hunk_search_and_replace.create_backup')
    def test_replace_hunks_with_errors_no_backup(self, mock_create_backup):
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

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(searches, replacements, file_system)

        self.assertEqual(updated_files["test.rs"], file_content)  # No changes should be made
        self.assertEqual(search_results["test.rs"]["hunks"][0]["matchPercentage"], 0)
        self.assertGreater(len(search_results["test.rs"]["hunks"][0]["errors"]), 0)
        self.assertEqual(backup_files, {})  # No backup should be created
        mock_create_backup.assert_not_called()

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function_search(self, mock_stdout):
        test_file = os.path.join(self.test_dir, 'main.rs')
        test_hunk = "fn main() {"
        sys.argv = ['hunk_search_and_replace.py', test_file, test_hunk]

        from hunk_search_and_replace import main
        main()

        output = mock_stdout.getvalue()
        result = json.loads(output)

        self.assertIn(test_file, result)
        self.assertEqual(result[test_file]['hunks'][0]['matches'][0]['content'], "fn main() {")

    @patch('sys.stdout', new_callable=StringIO)
    @patch('hunk_search_and_replace.write_file')
    @patch('hunk_search_and_replace.create_backup')
    @patch('hunk_search_and_replace.create_patch')
    @patch('hunk_search_and_replace.open', new_callable=mock_open)
    @patch('hunk_search_and_replace.read_file')
    def test_main_function_replace_with_backup(self, mock_read_file, mock_open, mock_create_patch, mock_create_backup, mock_write_file, mock_stdout):
        test_file = os.path.join(self.test_dir, 'main.rs')
        test_hunk = "fn main() {"
        replacement_hunk = "fn modified_main() {"
        sys.argv = ['hunk_search_and_replace.py', test_file, test_hunk, '--replace', replacement_hunk]

        mock_create_backup.return_value = f"{test_file}.old"
        mock_create_patch.return_value = "mock patch content"
        mock_read_file.return_value = "fn main() {\n    // Some content\n}"

        from hunk_search_and_replace import main
        main()

        output = mock_stdout.getvalue()
        self.assertIn("Replacement successful", output)
        self.assertIn(f"Original file backed up to: {test_file}.old", output)
        self.assertIn("Patch file created:", output)
        self.assertIn("Base64 encoded patch file created:", output)
        self.assertIn("Common ancestor directory:", output)

        mock_write_file.assert_called_once()
        written_content = mock_write_file.call_args[0][1]
        self.assertIn("fn modified_main() {", written_content)

        mock_create_backup.assert_called_once_with(test_file)
        mock_create_patch.assert_called_once()

    def test_create_patch(self):
        with patch('subprocess.run') as mock_run:
            mock_run.return_value.stdout = "mock diff output"
            mock_run.return_value.returncode = 1  # diff returns 1 when files are different

            patch_content = create_patch("file1.txt", "file2.txt")
            self.assertEqual(patch_content, "mock diff output")

            mock_run.assert_called_once_with(['diff', '-u', 'file1.txt', 'file2.txt'],
                                             capture_output=True, text=True, check=False)

    def test_create_base64_patch(self):
        patch_content = "This is a test patch"
        base64_patch = create_base64_patch(patch_content)
        self.assertEqual(base64.b64decode(base64_patch).decode(), patch_content)

    @patch('os.path.isdir')
    def test_find_common_ancestor(self, mock_isdir):
        def mock_isdir_behavior(path):
            return path in ['/', '/home', '/home/user', '/home/user/project']

        mock_isdir.side_effect = mock_isdir_behavior

        # Test with common project directory
        file_paths = [
            "/home/user/project/file1.txt",
            "/home/user/project/subdir/file2.txt",
            "/home/user/project/subdir/subsubdir/file3.txt"
        ]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, "/home/user/project")

        # Test with fewer common directories
        file_paths = [
            "/home/user/project1/file1.txt",
            "/home/user/project2/file2.txt",
        ]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, "/home/user")

        # Test with a single file
        file_paths = ["/home/user/project/file1.txt"]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, "/home/user/project")

        # Test with empty list
        common_ancestor = find_common_ancestor([])
        self.assertEqual(common_ancestor, "")

        # Test with root-level files
        file_paths = ["/file1.txt", "/file2.txt"]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, "/")

if __name__ == '__main__':
    unittest.main()
