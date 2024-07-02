"""
Search for hunks in files and optionally replace them, creating backups of original files and generating patch files.

This script orchestrates the entire process of searching and replacing content in files.
It handles command-line arguments, performs the replacements, and manages the creation of
backup and patch files. This function is designed to be the entry point of the script when
run from the command line.

Usage examples:
1. Search for hunks in a single file:
   python hunk_search_and_replace.py -f path/to/file.txt -s "search hunk"

2. Search and replace in multiple files:
   python hunk_search_and_replace.py -f file1.txt -s "search1" -r "replace1" -f file2.txt -s "search2" -r "replace2"

3. Search and replace with multi-line hunks:
   python hunk_search_and_replace.py -f file.txt -s "def example_function():
       print('Hello, World!')
       return None" -r "def new_function():
       print('Hello, Universe!')
       return True"

4. Search and replace multiple lines in multiple files:
   python hunk_search_and_replace.py \
   -f file1.py -s "def old_function1():
       print('Old message 1')
       return False" -r "def new_function1():
       print('New message 1')
       return True" \
   -f file2.py -s "class OldClass:
       def __init__(self):
           self.value = 0" -r "class NewClass:
       def __init__(self):
           self.value = 1"

Note: When using multi-line hunks, be careful with indentation and newline characters.
In some shells, you may need to escape newlines with backslashes for multi-line input.
"""
import os
import json
import shutil
import base64
import subprocess
import logging
from typing import Dict, List, Union, Tuple
import argparse
import tempfile

from typing_extensions import TypedDict

# Set up logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

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
    """
    Compare search hunks to files in the file system.

    This function is crucial for identifying where changes need to be made. It allows us to
    locate specific code segments within files, which is essential for targeted modifications.
    The detailed results it provides help in making informed decisions about replacements.

    Args:
    searches: A dictionary mapping file paths to lists of search hunks.
    file_system: A dictionary representing the file system, mapping file paths to their content.

    Returns:
    A SearchResult dictionary containing detailed information about matches and mismatches.
    """
    results: SearchResult = {}

    for file_name, file_hunks in searches.items():
        logging.debug(f"Processing file: {file_name}")
        if file_name not in file_system:
            results[file_name] = {
                "error": f'File "{file_name}" not found in the file system.',
                "hunks": [{"hunkLines": len(hunk[0].split('\n')), "matchPercentage": 0} for hunk in file_hunks]
            }
            continue

        file = file_system[file_name].split('\n')
        non_empty_lines = [(line.strip(), index + 1) for index, line in enumerate(file) if line.strip()]

        file_result: FileResult = {
            "fileName": file_name,
            "fileLines": len(file),
            "hunks": []
        }

        for hunk_index, hunk in enumerate(file_hunks):
            logging.debug(f"Processing hunk {hunk_index + 1} for file: {file_name}")
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


def create_backup(file_path: str) -> str:
    """
    Create a backup of the original file.

    This function is essential for maintaining data integrity and allowing for rollback.
    It provides a safety net, ensuring that original file contents are preserved before
    any modifications are made.

    Args:
    file_path: The path of the file to be backed up.

    Returns:
    The path of the created backup file.
    """
    base, ext = os.path.splitext(file_path)
    backup_path = f"{base}.old{ext}"
    shutil.copy2(file_path, backup_path)
    logging.debug(f"Backup created: {backup_path}")
    return backup_path


def create_patch(original_dir: str, updated_dir: str, patch_file: str) -> None:
    """
    Create a patch file representing the differences between original and updated files.

    This function is crucial for version control and change management. It allows us to
    track modifications, review changes, and potentially apply or revert them later.
    The use of relative paths in the patch makes it more portable across different environments.

    Args:
    original_dir: Directory containing the original files.
    updated_dir: Directory containing the updated files.
    common_ancestor: Common ancestor directory for creating relative paths.
    patch_file: Path where the patch file should be created.
    """
    logging.info("Starting patch creation process")
    try:
        result = subprocess.run(['diff', '-ruN', original_dir, updated_dir],
                                capture_output=True, text=True, check=False)
        logging.debug(f"Diff command return code: {result.returncode}")
        logging.debug(f"Diff command stdout: {result.stdout}")
        logging.debug(f"Diff command stderr: {result.stderr}")

        if result.returncode == 1:
            logging.info("Differences found")
            patch_content = result.stdout

            # Replace temporary directory paths with relative paths
            patch_lines = patch_content.split('\n')
            for i, line in enumerate(patch_lines):
                if line.startswith('--- ') or line.startswith('+++ '):
                    _, path = line.split(None, 1)
                    rel_path = os.path.relpath(path, original_dir if line.startswith('---') else updated_dir)
                    project_path = os.path.join('src', rel_path)
                    patch_lines[i] = f"{line[:4]}{project_path}"

            patch_content = '\n'.join(patch_lines)

            with open(patch_file, 'w') as f:
                f.write(patch_content)
            logging.info(f"Patch file created: {patch_file}")
        elif result.returncode == 0:
            logging.info("No differences found")
        else:
            logging.warning(f"Unexpected return code from diff command: {result.returncode}")

    except FileNotFoundError:
        logging.error("Error: The 'diff' utility is not available on this system.")


def replace_hunks_in_files(searches: Dict[str, List[List[str]]], replacements: Dict[str, List[List[str]]],
                           file_system: FileSystem) -> Tuple[
    SearchResult, Dict[str, str], Dict[str, str], str, str, str]:
    """
    Replace specified hunks in files with their corresponding replacements.

    This function is the core of our search and replace functionality. It orchestrates the entire
    process of finding matches, creating backups, applying changes, and generating patch files.
    It's designed to handle multiple files and multiple hunks per file, making it versatile for
    various code modification scenarios.

    Args:
    searches: A dictionary mapping file paths to lists of search hunks.
    replacements: A dictionary mapping file paths to lists of replacement hunks.
    file_system: A dictionary representing the file system, mapping file paths to their content.

    Returns:
    A tuple containing:
    - Search results
    - Updated file contents
    - Backup file paths
    - Path to the created patch file
    - Path to the base64 encoded patch file
    - Common ancestor directory
    """

    logging.debug(f"replace_hunks_in_files - searches: {json.dumps(searches, indent=2)}")
    logging.debug(f"replace_hunks_in_files - replacements: {json.dumps(replacements, indent=2)}")
    logging.debug(f"replace_hunks_in_files - file_system keys: {list(file_system.keys())}")

    # Expected structure:
    expected_searches = {
        "/path/to/file1.rs": [["hunk1 for file1"], ["hunk2 for file1"]],
        "/path/to/file2.rs": [["hunk1 for file2"]]
    }
    expected_replacements = {
        "/path/to/file1.rs": [["replacement1 for file1"], ["replacement2 for file1"]],
        "/path/to/file2.rs": [["replacement1 for file2"]]
    }
    logging.debug(
        f"replace_hunks_in_files - expected searches structure: {json.dumps(expected_searches, indent=2)}")
    logging.debug(
        f"replace_hunks_in_files - expected replacements structure: {json.dumps(expected_replacements, indent=2)}")

    search_results = compare_hunks_to_files(searches, file_system)
    updated_files = file_system.copy()
    backup_files = {}
    modified_files = []

    common_ancestor = find_common_ancestor(list(searches.keys()))
    project_root = find_project_root(list(searches.keys()))
    patch_file = os.path.join(project_root, "changes.patch")
    base64_patch_file = os.path.join(project_root, "changes.patch.b64")

    # Create temporary directories for original and updated files
    with tempfile.TemporaryDirectory() as original_temp_dir, tempfile.TemporaryDirectory() as updated_temp_dir:
        for file_name, result in search_results.items():
            logging.info(f"Processing file: {file_name}")
            if "error" in result:
                logging.warning(f"Error found for file: {file_name}")
                continue

            if any(hunk["errors"] for hunk in result["hunks"]):
                logging.warning(f"Errors found in hunks for file: {file_name}")
                continue

            # Create backup before making changes
            backup_files[file_name] = create_backup(file_name)
            logging.info(f"Backup created for file: {file_name}")

            # Copy original file to temporary directory
            rel_path = os.path.relpath(file_name, common_ancestor)
            original_temp_file = os.path.join(original_temp_dir, rel_path)
            os.makedirs(os.path.dirname(original_temp_file), exist_ok=True)
            shutil.copy2(backup_files[file_name], original_temp_file)

            file_lines = updated_files[file_name].split('\n')
            original_content = '\n'.join(file_lines)
            changes_made = False

            for hunk_index, hunk_result in enumerate(result["hunks"]):
                logging.info(f"Processing hunk {hunk_index + 1} for file: {file_name}")
                replacement_lines = replacements[file_name][hunk_index][0].split('\n')
                start_line = hunk_result["matches"][0]["fileLineNum"] - 1
                end_line = hunk_result["matches"][-1]["fileLineNum"]

                logging.debug(f"Original lines: {file_lines[start_line:end_line]}")
                logging.debug(f"Replacement lines: {replacement_lines}")

                # Preserve indentation
                if start_line > 0:
                    original_indent = len(file_lines[start_line]) - len(file_lines[start_line].lstrip())
                    replacement_lines = [' ' * original_indent + line for line in replacement_lines]

                file_lines[start_line:end_line] = replacement_lines
                changes_made = True

            if changes_made:
                logging.info(f"Changes made to file: {file_name}")
                updated_content = '\n'.join(file_lines)

                # Check if the content has actually changed
                if original_content == updated_content:
                    logging.error(f"File content did not change after replacement: {file_name}")
                    raise AssertionError(f"File content did not change after replacement: {file_name}")

                # Write updated content to temporary directory
                updated_temp_file = os.path.join(updated_temp_dir, rel_path)
                os.makedirs(os.path.dirname(updated_temp_file), exist_ok=True)
                with open(updated_temp_file, 'w') as f:
                    f.write(updated_content)

                # Update the actual file
                temp_path = file_name + '.tmp'
                with open(temp_path, 'w') as f:
                    f.write(updated_content)
                    f.flush()
                    os.fsync(f.fileno())
                os.replace(temp_path, file_name)
                updated_files[file_name] = updated_content
                modified_files.append(file_name)

                # Double-check that the file was actually modified
                with open(file_name, 'r') as f:
                    current_content = f.read()
                if current_content != updated_content:
                    logging.error(f"File content does not match expected content after writing: {file_name}")
                    raise AssertionError(f"File content does not match expected content after writing: {file_name}")

                logging.debug(f"Updated file content: {updated_files[file_name]}")
                logging.info(f"File mtime after: {os.path.getmtime(file_name)}")
            else:
                logging.info(f"No changes made to file: {file_name}")

        # Create patch file after all changes have been made
        if modified_files:
            logging.info(f"Creating patch file: {patch_file}")
            create_patch(original_temp_dir, updated_temp_dir, patch_file)

            with open(patch_file, 'r') as f:
                patch_content = f.read()

            with open(base64_patch_file, 'w') as f:
                f.write(create_base64_patch(patch_content))
        else:
            logging.info("No files were modified. Patch file not created.")

    logging.info("replace_hunks_in_files function completed")
    return search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor


def create_base64_patch(patch_content: str) -> str:
    """
    Create a base64 encoded version of the patch content.

    This function is useful for situations where we need to transmit or store the patch
    in a format that's safe for text-based systems. Base64 encoding ensures that the
    patch can be safely included in JSON or XML documents, or transmitted over protocols
    that may mangle binary data.

    Args:
    patch_content: The content of the patch file as a string.

    Returns:
    A base64 encoded string of the patch content.
    """
    return base64.b64encode(patch_content.encode()).decode()


def find_project_root(file_paths: List[str]) -> str:
    """
    Find the project root directory based on a list of file paths.

    This function first finds the common ancestor of all given file paths,
    then looks for common project root indicators. If no indicators are found,
    it falls back to using the common ancestor as the project root.

    Args:
    file_paths: A list of file paths within the project.

    Returns:
    The path of the identified project root directory.
    """
    common_ancestor = find_common_ancestor(file_paths)

    # List of common files/directories that indicate a project root
    root_indicators = [
        '.git',
        '.hg',
        '.svn',
        'pyproject.toml',
        'setup.py',
        'package.json',
        'Cargo.toml',
        'pom.xml',
        'build.gradle',
        'Makefile',
        'CMakeLists.txt'
    ]

    current_dir = common_ancestor
    while current_dir != os.path.dirname(current_dir):  # Stop at filesystem root
        for indicator in root_indicators:
            if os.path.exists(os.path.join(current_dir, indicator)):
                return current_dir
        current_dir = os.path.dirname(current_dir)

    # If no indicators found, return the common ancestor
    return common_ancestor


def find_common_ancestor(file_paths: List[str]) -> str:
    """
    Find the common ancestor directory of all given file paths.

    This function is crucial for generating relative paths in the patch file. By identifying
    the common ancestor, we can create patches that are more portable and can be applied
    in different directory structures, as long as the relative structure is maintained.

    Args:
    file_paths: A list of file paths to find the common ancestor for.

    Returns:
    The path of the common ancestor directory.
    """
    if not file_paths:
        return ""
    common_path = os.path.commonpath(file_paths)
    while common_path and not os.path.isdir(common_path):
        common_path = os.path.dirname(common_path)
    return common_path


def read_file(file_path: str) -> str:
    """
    Read the contents of a file.

    This utility function centralizes file reading operations, making it easier to add
    error handling or logging if needed in the future.

    Args:
    file_path: The path of the file to read.

    Returns:
    The contents of the file as a string.
    """
    with open(file_path, 'r') as f:
        return f.read()


def write_file(file_path: str, content: str) -> None:
    """
    Write content to a file.

    This function centralizes file writing operations, including safety checks to ensure
    the content is actually written. It's crucial for maintaining data integrity when
    modifying files.

    Args:
    file_path: The path of the file to write.
    content: The content to write to the file.
    """
    with open(file_path, 'w') as f:
        f.write(content)

    # Verify that the file was written correctly
    with open(file_path, 'r') as f:
        written_content = f.read()
    if written_content != content:
        logging.error(f"File content does not match expected content after writing: {file_path}")
        raise AssertionError(f"File content does not match expected content after writing: {file_path}")


def parse_arguments(args: List[str] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Search for hunks in files and optionally replace them, creating backups and patch files.")
    parser.add_argument("-f", "--file", action='append', required=True, help="Path to the file to search in")
    parser.add_argument("-s", "--search", action='append', required=True, help="Hunk to search for")
    parser.add_argument("-r", "--replace", action='append', help="Hunk to replace with")

    parsed_args = parser.parse_args(args)

    searches = {}
    replacements = {}
    for i, file_path in enumerate(parsed_args.file):
        if file_path not in searches:
            searches[file_path] = []
        searches[file_path].append([parsed_args.search[i]])

        if parsed_args.replace:
            if file_path not in replacements:
                replacements[file_path] = []
            if i < len(parsed_args.replace):
                replacements[file_path].append([parsed_args.replace[i]])

    parsed_args.searches = searches
    parsed_args.replacements = replacements

    logging.debug(f"parse_arguments - searches: {json.dumps(searches, indent=2)}")
    logging.debug(f"parse_arguments - replacements: {json.dumps(replacements, indent=2)}")

    return parsed_args


def main():
    args = parse_arguments()

    # Use args.searches directly instead of recreating it
    searches = args.searches
    replacements = args.replacements


    logging.debug(f"main - searches: {json.dumps(searches, indent=2)}")
    logging.debug(f"main - replacements: {json.dumps(replacements, indent=2)}")

    if args.replace and len(args.replace) != len(args.search):
        print("Error: The number of replacement hunks must match the number of search hunks.")
        return

    file_system = {file_path: read_file(file_path) for file_path in searches.keys()}

    if args.replace:
        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(
            searches, replacements, file_system)

        if any("error" in result for result in search_results.values()) or \
                any(hunk["errors"] for result in search_results.values() if "hunks" in result for hunk in
                    result["hunks"]):
            print("Errors occurred during search. Replacement aborted.")
            print(json.dumps(search_results, indent=2))
        else:
            for file_path, content in updated_files.items():
                write_file(file_path, content)

            print("Replacement successful.")
            for file_path, backup_path in backup_files.items():
                print(f"Original file {file_path} backed up to: {backup_path}")
            if os.path.exists(patch_file):
                print(f"Patch file created: {patch_file}")
                print(f"Base64 encoded patch file created: {base64_patch_file}")
            else:
                print("No patch file created as no changes were made.")
            print(f"Project root directory: {os.path.dirname(patch_file)}")
            print(f"Common ancestor directory: {common_ancestor}")
            print(json.dumps(search_results, indent=2))
    else:
        result = compare_hunks_to_files(searches, file_system)
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
