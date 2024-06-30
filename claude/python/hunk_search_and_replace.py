import os
import sys
import json
import shutil
import base64
import subprocess
import logging
from typing import Dict, List, Union, Tuple
import argparse
import hashlib

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
    results: SearchResult = {}

    for file_name, hunks in searches.items():
        logging.debug(f"Processing file: {file_name}")
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

        for hunk_index, hunk in enumerate(hunks):
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
    """Create a backup of the original file with 'old' appended to its name."""
    base, ext = os.path.splitext(file_path)
    backup_path = f"{base}.old{ext}"
    shutil.copy2(file_path, backup_path)
    logging.debug(f"Backup created: {backup_path}")
    return backup_path


def create_patch(original_files: Dict[str, str], updated_files: Dict[str, str], common_ancestor: str,
                 patch_file: str) -> None:
    logging.info("Starting patch creation process")
    try:
        for file_name in original_files:
            original_path = original_files[file_name]
            updated_path = updated_files[file_name]
            relative_path = os.path.relpath(file_name, common_ancestor)
            logging.debug(f"Creating patch for file: {file_name}")
            logging.debug(f"Original path: {original_path}")
            logging.debug(f"Updated path: {updated_path}")
            logging.debug(f"Relative path: {relative_path}")

            result = subprocess.run(['diff', '-u', original_path, updated_path],
                                    capture_output=True, text=True, check=False)
            logging.debug(f"Diff command return code: {result.returncode}")
            logging.debug(f"Diff command stdout: {result.stdout}")
            logging.debug(f"Diff command stderr: {result.stderr}")

            if result.returncode == 1:
                logging.info(f"Differences found in file: {file_name}")
                with open(patch_file, 'a') as f:
                    f.write(f"--- {relative_path}\n")
                    f.write(f"+++ {relative_path}\n")
                    f.write(result.stdout)
                logging.info(f"Appended patch for {file_name} to {patch_file}")
            elif result.returncode == 0:
                logging.info(f"No differences found in file: {file_name}")
            else:
                logging.warning(f"Unexpected return code from diff command: {result.returncode}")

    except FileNotFoundError:
        logging.error("Error: The 'diff' utility is not available on this system.")


def replace_hunks_in_files(searches: Dict[str, List[List[str]]], replacements: Dict[str, List[List[str]]],
                           file_system: FileSystem) -> Tuple[
    SearchResult, Dict[str, str], Dict[str, str], str, str, str]:
    logging.info("Starting replace_hunks_in_files function")
    search_results = compare_hunks_to_files(searches, file_system)
    updated_files = file_system.copy()
    backup_files = {}
    modified_files = []

    common_ancestor = find_common_ancestor(list(searches.keys()))
    patch_file = os.path.join(common_ancestor, "changes.patch")
    base64_patch_file = os.path.join(common_ancestor, "changes.patch.b64")

    # Ensure the directory exists before creating the file
    os.makedirs(os.path.dirname(patch_file), exist_ok=True)
    open(patch_file, 'w').close()

    for file_name, result in search_results.items():
        logging.info(f"Processing file: {file_name}")
        if "error" in result:
            logging.warning(f"Error found for file: {file_name}")
            continue

        if any(hunk["errors"] for hunk in result["hunks"]):
            logging.warning(f"Errors found in hunks for file: {file_name}")
            continue

        # Create backup before making changes
        backup_filename = create_backup(file_name)
        backup_files[file_name] = backup_filename
        logging.info(f"Backup created for file: {file_name}")

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

            #             temp_path = file_name + '.tmp'
            with open(file_name, 'w') as f:
                f.write(updated_content)
                f.flush()
                os.fsync(f.fileno())
            #             os.replace(temp_path, file_name)
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

    logging.info(f"Creating patch file: {patch_file}")
    create_patch(backup_files, dict(zip(modified_files, modified_files)), common_ancestor, patch_file)

    with open(patch_file, 'r') as f:
        patch_content = f.read()

    with open(base64_patch_file, 'w') as f:
        f.write(create_base64_patch(patch_content))

    logging.info("replace_hunks_in_files function completed")
    return search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor


def create_base64_patch(patch_content: str) -> str:
    return base64.b64encode(patch_content.encode()).decode()


def find_common_ancestor(file_paths: List[str]) -> str:
    if not file_paths:
        return ""
    common_path = os.path.commonpath(file_paths)
    while common_path and not os.path.isdir(common_path):
        common_path = os.path.dirname(common_path)
    return common_path


def read_file(file_path: str) -> str:
    with open(file_path, 'r') as f:
        return f.read()


def write_file(file_path: str, content: str) -> None:
    with open(file_path, 'w') as f:
        f.write(content)

    # Verify that the file was written correctly
    with open(file_path, 'r') as f:
        written_content = f.read()
    if written_content != content:
        logging.error(f"File content does not match expected content after writing: {file_path}")
        raise AssertionError(f"File content does not match expected content after writing: {file_path}")


def main():
    """
    Search for hunks in files and optionally replace them, creating backups of original files and generating patch files.

    Demo Usage:
    1. Search for a hunk:
       python hunk_search.py path/to/file.txt "search hunk"

    2. Search for multiple hunks:
       python hunk_search.py path/to/file.txt "search hunk 1" "search hunk 2"

    3. Search and replace a single hunk:
       python hunk_search.py path/to/file.txt "search hunk" --replace "replacement hunk"

    4. Search and replace multiple hunks:
       python hunk_search.py path/to/file.txt "search hunk 1" "search hunk 2" --replace "replacement 1" "replacement 2"

    5. Search for a multi-line hunk:
       python hunk_search.py path/to/file.txt "def example_function():
           print('Hello, World!')
           return None"

    6. Replace with a multi-line hunk:
       python hunk_search.py path/to/file.txt "def example_function():" --replace "def new_function():
           print('Hello, Universe!')
           return True"

    7. Replace multiple multi-line hunks:
       python hunk_search.py path/to/file.txt "def function1():
       print('First function')
       return None" "def function2():
       print('Second function')
       return False" --replace "def new_function1():
       print('New first function')
       return True" "def new_function2():
       print('New second function')
       return True"

    Note: When using multi-line hunks, enclose them in quotes and be careful with indentation.
    In some shells, you may need to escape newlines with backslashes for multi-line input.

    Example with escaped newlines:
    python hunk_search.py path/to/file.txt "def function1():\n    print('First function')\n    return None" \
    --replace "def new_function1():\n    print('New first function')\n    return True"

    Note: When replacing, the original file will be backed up with '.old' appended to its name.
    A patch file and its base64 encoded version will be created in the common ancestor directory of all modified files.
    """
    parser = argparse.ArgumentParser(
        description="Search for hunks in files and optionally replace them, creating backups and patch files.")
    parser.add_argument("file_path", help="Path to the file to search in")
    parser.add_argument("search_hunks", nargs="+", help="Hunks to search for")
    parser.add_argument("--replace", nargs="+",
                        help="Hunks to replace with (if specified, must match the number of search hunks)")
    args = parser.parse_args()

    file_system = {args.file_path: read_file(args.file_path)}
    searches = {args.file_path: [[hunk] for hunk in args.search_hunks]}

    if args.replace:
        if len(args.replace) != len(args.search_hunks):
            print("Error: The number of replacement hunks must match the number of search hunks.")
            return

        replacements = {args.file_path: [[hunk] for hunk in args.replace]}

        # Calculate and log the hash of the original file
        original_hash = hashlib.md5(file_system[args.file_path].encode()).hexdigest()
        logging.info(f"Original file hash: {original_hash}")

        search_results, updated_files, backup_files, patch_file, base64_patch_file, common_ancestor = replace_hunks_in_files(
            searches, replacements, file_system)

        if any("error" in result for result in search_results.values()) or \
                any(hunk["errors"] for result in search_results.values() if "hunks" in result for hunk in
                    result["hunks"]):
            print("Errors occurred during search. Replacement aborted.")
            print(json.dumps(search_results, indent=2))
        else:
            # Calculate and log the hash of the updated file
            updated_hash = hashlib.md5(updated_files[args.file_path].encode()).hexdigest()
            logging.info(f"Updated file hash: {updated_hash}")

            if original_hash == updated_hash:
                logging.error("File content did not change after replacement.")
                raise AssertionError("File content did not change after replacement.")

            write_file(args.file_path, updated_files[args.file_path])

            # Verify that the file was actually modified
            with open(args.file_path, 'r') as f:
                final_content = f.read()
            final_hash = hashlib.md5(final_content.encode()).hexdigest()
            if final_hash != updated_hash:
                logging.error("File content does not match expected content after writing.")
                raise AssertionError("File content does not match expected content after writing.")

            print(f"Replacement successful. Original file backed up to: {backup_files[args.file_path]}")
            print(f"Patch file created: {patch_file}")
            print(f"Base64 encoded patch file created: {base64_patch_file}")
            print(f"Common ancestor directory: {common_ancestor}")
            print(json.dumps(search_results, indent=2))
    else:
        result = compare_hunks_to_files(searches, file_system)
        print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
