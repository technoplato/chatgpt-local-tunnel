import unittest
import os
import sys
import json
import base64
import tempfile
import shutil
import subprocess
from io import StringIO
from unittest.mock import patch, mock_open

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search_and_replace import compare_hunks_to_files, replace_hunks_in_files, read_file, write_file, create_backup, create_patch, create_base64_patch, find_common_ancestor

class TestHunkSearch(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.test_files = {
            'main.rs': """// Main function
use std::collections::HashMap;

fn main() {
    let mut map = HashMap::new();
    map.insert("key1", "value1");
    map.insert("key2", "value2");

    // Iterate over the map
    for (key, value) in &map {
        println!("{}: {}", key, value);
    }
}""",
            'utils.rs': """pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}"""
        }

        for file_name, content in self.test_files.items():
            file_path = os.path.join(self.temp_dir, file_name)
            with open(file_path, 'w') as f:
                f.write(content)

    def tearDown(self):
        shutil.rmtree(self.temp_dir)

    def test_rust_file_with_comments(self):
        searches = {
            os.path.join(self.temp_dir, 'main.rs'): [
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

        result = compare_hunks_to_files(searches, {file_path: read_file(file_path) for file_path in searches})
        self.assertEqual(result[os.path.join(self.temp_dir, 'main.rs')]["hunks"][0]["matchPercentage"], 100)
        self.assertEqual(result[os.path.join(self.temp_dir, 'main.rs')]["hunks"][1]["matchPercentage"], 100)

    def test_non_existent_file(self):
        searches = {
            os.path.join(self.temp_dir, 'non_existent.rs'): [["This file does not exist"]]
        }

        result = compare_hunks_to_files(searches, {})
        self.assertEqual(result[os.path.join(self.temp_dir, 'non_existent.rs')], {
            "error": f'File "{os.path.join(self.temp_dir, "non_existent.rs")}" not found in the file system.',
            "hunks": [{"hunkLines": 1, "matchPercentage": 0}]
        })

    def test_replace_hunks(self):
        file_path = os.path.join(self.temp_dir, 'utils.rs')
        searches = {
            file_path: [
                ["pub fn add(a: i32, b: i32) -> i32 {"]
            ]
        }
        replacements = {
            file_path: [
                ["pub fn add(a: i32, b: i32) -> i32 {\n    // New comment\n"]
            ]
        }

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(searches, replacements, {file_path: read_file(file_path)})

        self.assertIn("// New comment", updated_files[file_path])
        self.assertEqual(search_results[file_path]["hunks"][0]["matchPercentage"], 100)
        self.assertTrue(os.path.exists(backup_files[file_path]))
        self.assertTrue(os.path.exists(patch_file))
        self.assertTrue(os.path.exists(base64_patch_file))
        self.assertEqual(common_ancestor, self.temp_dir)

    def test_replace_hunks_with_errors_no_backup(self):
        file_path = os.path.join(self.temp_dir, 'utils.rs')
        searches = {
            file_path: [
                ["pub fn non_existent_function(a: i32, b: i32) -> i32 {"]
            ]
        }
        replacements = {
            file_path: [
                ["pub fn new_function(a: i32, b: i32) -> i32 {"]
            ]
        }

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(searches, replacements, {file_path: read_file(file_path)})

        self.assertEqual(updated_files[file_path], self.test_files['utils.rs'])  # No changes should be made
        self.assertEqual(search_results[file_path]["hunks"][0]["matchPercentage"], 0)
        self.assertGreater(len(search_results[file_path]["hunks"][0]["errors"]), 0)
        self.assertEqual(backup_files, {})  # No backup should be created

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function_search(self, mock_stdout):
        test_file = os.path.join(self.temp_dir, 'main.rs')
        test_hunk = "fn main() {"
        sys.argv = ['hunk_search_and_replace.py', test_file, test_hunk]

        from hunk_search_and_replace import main
        main()

        output = mock_stdout.getvalue()
        print("\nCaptured stdout (search):")
        print(output)

        result = json.loads(output)
        self.assertIn(test_file, result)
        self.assertEqual(result[test_file]['hunks'][0]['matches'][0]['content'], "fn main() {")

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function_replace_with_backup(self, mock_stdout):
        print("\n--- Debug Output Start ---")

        test_file = os.path.join(self.temp_dir, 'main.rs')
        test_hunk = "fn main() {"
        replacement_hunk = "fn modified_main() {"
        sys.argv = ['hunk_search_and_replace.py', test_file, test_hunk, '--replace', replacement_hunk]

        print(f"Test file: {test_file}")
        print(f"Test hunk: {test_hunk}")
        print(f"Replacement hunk: {replacement_hunk}")

        # Print original file content
        with open(test_file, 'r') as f:
            original_content = f.read()
        print("\nOriginal file content:")
        print(original_content)

        from hunk_search_and_replace import main
        main()

        output = mock_stdout.getvalue()
        print("\nCaptured stdout (replace):")
        print(output)

        # Print updated file content
        with open(test_file, 'r') as f:
            updated_content = f.read()
        print("\nUpdated file content:")
        print(updated_content)

        # Check if the file content has actually changed
        content_changed = original_content != updated_content
        print(f"\nFile content changed: {content_changed}")
        if not content_changed:
            print("Original content:")
            print(repr(original_content))
            print("Updated content:")
            print(repr(updated_content))

        self.assertTrue(content_changed, "File content should have changed")

        # Extract the patch file path from the output
        patch_file_line = next((line for line in output.split('\n') if "Patch file created:" in line), None)
        if patch_file_line:
            patch_file_path = patch_file_line.split(": ")[1].strip()
            print(f"\nPatch file path: {patch_file_path}")
            if os.path.exists(patch_file_path):
                with open(patch_file_path, 'r') as f:
                    patch_content = f.read()
                print("Patch file content:")
                print(patch_content)
            else:
                print("Patch file does not exist")
                patch_content = ""
        else:
            print("Patch file path not found in output")
            patch_content = ""

        print("--- Debug Output End ---\n")

        # Assertions
        self.assertIn("Replacement successful", output)
        self.assertIn("Original file backed up to:", output)
        self.assertIn("Patch file created:", output)
        self.assertIn("Base64 encoded patch file created:", output)
        self.assertIn("Common ancestor directory:", output)
        self.assertIn("fn modified_main() {", updated_content)

        self.assertTrue(os.path.exists(patch_file_path), "Patch file should exist")
        self.assertNotEqual(patch_content, "", "Patch content should not be empty")
        self.assertIn("--- ", patch_content)
        self.assertIn("+++ ", patch_content)
        self.assertIn("-fn main() {", patch_content)
        self.assertIn("+fn modified_main() {", patch_content)

    def test_create_patch(self):
        file_path = os.path.join(self.temp_dir, 'test.txt')

        with open(file_path, 'w') as f:
            f.write("Original content\n")

        # Create a backup of the original file
        backup_file = create_backup(file_path)

        # Modify the original file
        with open(file_path, 'w') as f:
            f.write("Updated content\n")

        patch_content = create_patch({file_path: backup_file}, {file_path: file_path}, self.temp_dir)
        print("\nCreated patch content:")
        print(patch_content)

        self.assertIn("--- ", patch_content)
        self.assertIn("+++ ", patch_content)
        self.assertIn("-Original content", patch_content)
        self.assertIn("+Updated content", patch_content)

    def test_create_base64_patch(self):
        patch_content = "This is a test patch"
        base64_patch = create_base64_patch(patch_content)
        self.assertEqual(base64.b64decode(base64_patch).decode(), patch_content)

    def test_find_common_ancestor(self):
        dir1 = os.path.join(self.temp_dir, "dir1")
        dir2 = os.path.join(self.temp_dir, "dir2")
        os.makedirs(dir1)
        os.makedirs(dir2)

        file_paths = [
            os.path.join(dir1, "file1.txt"),
            os.path.join(dir2, "file2.txt"),
        ]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, self.temp_dir)

        # Test with a single file
        file_paths = [os.path.join(dir1, "file1.txt")]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, dir1)

        # Test with empty list
        common_ancestor = find_common_ancestor([])
        self.assertEqual(common_ancestor, "")

if __name__ == '__main__':
    unittest.main()
