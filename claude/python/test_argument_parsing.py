import unittest
from hunk_search_and_replace import parse_arguments


class TestArgumentParsing(unittest.TestCase):
    def test_argument_parsing(self):
        # Simulate command line arguments
        test_args = [
            'hunk_search_and_replace.py',  # This should now be ignored by parse_arguments
            '-f', '/path/to/main.rs',
            '-s', 'fn main() {\n    let mut map = HashMap::new();\n    map.insert("key1", "value1");',
            '-r',
            'fn modified_main() {\n    let mut modified_map = HashMap::new();\n    modified_map.insert("key1", "new_value1");',
            '-f', '/path/to/math.rs',
            '-s', 'pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}',
            '-r', 'pub fn add(a: i32, b: i32) -> i32 {\n    // New comment\n    let result = a + b;\n    result\n}'
        ]

        # Parse the arguments
        args = parse_arguments(test_args)

        # Check if the parsing is correct
        expected_searches = {
            '/path/to/main.rs': [
                ['fn main() {\n    let mut map = HashMap::new();\n    map.insert("key1", "value1");']
            ],
            '/path/to/math.rs': [
                ['pub fn add(a: i32, b: i32) -> i32 {\n    a + b\n}']
            ]
        }
        expected_replacements = {
            '/path/to/main.rs': [
                [
                    'fn modified_main() {\n    let mut modified_map = HashMap::new();\n    modified_map.insert("key1", "new_value1");']
            ],
            '/path/to/math.rs': [
                ['pub fn add(a: i32, b: i32) -> i32 {\n    // New comment\n    let result = a + b;\n    result\n}']
            ]
        }

        self.assertEqual(args.searches, expected_searches)
        self.assertEqual(args.replacements, expected_replacements)


if __name__ == '__main__':
    unittest.main()
