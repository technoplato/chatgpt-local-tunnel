import unittest
import os
import sys
import shutil
from io import StringIO
from unittest.mock import patch

# Add the directory containing the script to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from hunk_search_and_replace import main


class TestMainFunction(unittest.TestCase):
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
        pass
        # if os.path.exists(self.project_root):
        #     shutil.rmtree(self.project_root)

    @patch('sys.stdout', new_callable=StringIO)
    def test_main_function_replace_with_backup_multiple_files(self, mock_stdout):
        print("\n--- Debug Output Start ---")

        main_file = os.path.join(self.project_root, 'src', 'main.rs')
        math_file = os.path.join(self.project_root, 'src', 'utils', 'math.rs')

        sys.argv = ['hunk_search_and_replace.py',
                    '-f', main_file,
                    '-s', """fn main() {
    let mut map = HashMap::new();
    map.insert("key1", "value1");""",
                    '-r', """fn modified_main() {
    let mut modified_map = HashMap::new();
    modified_map.insert("key1", "new_value1");""",
                    '-f', math_file,
                    '-s', """pub fn add(a: i32, b: i32) -> i32 {
    a + b
}""",
                    '-r', """pub fn add(a: i32, b: i32) -> i32 {
    // New comment
    let result = a + b;
    result
}"""]

        print(f"Test files: {main_file}, {math_file}")
        print(f"Command line arguments: {sys.argv}")

        # Print original file contents
        for file_path in [main_file, math_file]:
            with open(file_path, 'r') as f:
                original_content = f.read()
            print(f"\nOriginal content of {os.path.basename(file_path)}:")
            print(original_content)

        main()

        output = mock_stdout.getvalue()
        print("\nCaptured stdout (replace):")
        print(output)

        # Print updated file contents
        for file_path in [main_file, math_file]:
            with open(file_path, 'r') as f:
                updated_content = f.read()
            print(f"\nUpdated content of {os.path.basename(file_path)}:")
            print(updated_content)

        print("--- Debug Output End ---\n")

        # Assertions
        # self.assertIn("Replacement successful", output)
        # # self.assertIn("Original file backed up to:", output)
        # self.assertIn("Patch file created:", output)
        # self.assertIn("Base64 encoded patch file created:", output)
        # self.assertIn("Common ancestor directory:", output)

        with open(main_file, 'r') as f:
            main_content = f.read()
        with open(math_file, 'r') as f:
            math_content = f.read()

        self.assertIn("fn modified_main() {", main_content)
        self.assertIn("let mut modified_map = HashMap::new();", main_content)
        self.assertIn("modified_map.insert(\"key1\", \"new_value1\");", main_content)
        self.assertIn("// New comment", math_content)
        self.assertIn("let result = a + b;", math_content)
        self.assertIn("result", math_content)


if __name__ == '__main__':
    unittest.main()
