import unittest
import os
import sys
import shutil

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search_and_replace import compare_hunks_to_files, replace_hunks_in_files, read_file, write_file, \
    create_backup, create_patch, create_base64_patch, find_common_ancestor


class TestHunkSearch(unittest.TestCase):
    def setUp(self):
        self.test_dir = os.path.dirname(os.path.abspath(__file__))
        self.project_root = os.path.join(self.test_dir, 'test_project')
        os.makedirs(self.project_root, exist_ok=True)

        self.test_files = {
            os.path.join('src', 'main.rs'): """// Main function
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
            os.path.join('src', 'utils', 'math.rs'): """pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}"""
        }

        for file_name, content in self.test_files.items():
            file_path = os.path.join(self.project_root, file_name)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, 'w') as f:
                f.write(content)

    def tearDown(self):
        if os.path.exists(self.project_root):
            shutil.rmtree(self.project_root)

    def test_compare_hunks_to_files(self):
        searches = {
            os.path.join(self.project_root, 'src', 'main.rs'): [
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
        self.assertEqual(result[os.path.join(self.project_root, 'src', 'main.rs')]["hunks"][0]["matchPercentage"], 100)
        self.assertEqual(result[os.path.join(self.project_root, 'src', 'main.rs')]["hunks"][1]["matchPercentage"], 100)

    def test_non_existent_file(self):
        searches = {
            os.path.join(self.project_root, 'src', 'non_existent.rs'): [["This file does not exist"]]
        }

        result = compare_hunks_to_files(searches, {})
        self.assertEqual(result[os.path.join(self.project_root, 'src', 'non_existent.rs')], {
            "error": f'File "{os.path.join(self.project_root, "src", "non_existent.rs")}" not found in the file system.',
            "hunks": [{"hunkLines": 1, "matchPercentage": 0}]
        })

    def test_replace_hunks(self):
        file_path = os.path.join(self.project_root, 'src', 'utils', 'math.rs')
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

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(
            searches, replacements, {file_path: read_file(file_path)})

        self.assertIn("// New comment", updated_files[file_path])
        self.assertEqual(search_results[file_path]["hunks"][0]["matchPercentage"], 100)
        self.assertTrue(os.path.exists(backup_files[file_path]))
        self.assertTrue(os.path.exists(patch_file))
        self.assertTrue(os.path.exists(base64_patch_file))
        self.assertEqual(common_ancestor, self.project_root)

        # Check if the patch file uses relative paths
        with open(patch_file, 'r') as f:
            patch_content = f.read()
        self.assertIn("--- src/utils/math.rs", patch_content)
        self.assertIn("+++ src/utils/math.rs", patch_content)

    def test_find_common_ancestor(self):
        file_paths = [
            os.path.join(self.project_root, 'src', 'main.rs'),
            os.path.join(self.project_root, 'src', 'utils', 'math.rs')
        ]
        common_ancestor = find_common_ancestor(file_paths)
        self.assertEqual(common_ancestor, self.project_root)


if __name__ == '__main__':
    unittest.main()
