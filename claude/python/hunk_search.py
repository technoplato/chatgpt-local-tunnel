import os
import sys
import json
from typing import Dict, List, Union, TypedDict, Tuple
import argparse

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

def replace_hunks_in_files(searches: Dict[str, List[List[str]]], replacements: Dict[str, List[List[str]]], file_system: FileSystem) -> Tuple[SearchResult, Dict[str, str]]:
    search_results = compare_hunks_to_files(searches, file_system)
    updated_files = file_system.copy()

    for file_name, result in search_results.items():
        if "error" in result:
            continue

        file_lines = updated_files[file_name].split('\n')
        for hunk_index, hunk_result in enumerate(result["hunks"]):
            if hunk_result["errors"]:
                continue

            replacement_lines = replacements[file_name][hunk_index][0].split('\n')
            start_line = hunk_result["matches"][0]["fileLineNum"] - 1
            end_line = hunk_result["matches"][-1]["fileLineNum"]

            # Preserve indentation
            if start_line > 0:
                original_indent = len(file_lines[start_line]) - len(file_lines[start_line].lstrip())
                replacement_lines = [' ' * original_indent + line for line in replacement_lines]

            file_lines[start_line:end_line] = replacement_lines

        updated_files[file_name] = '\n'.join(file_lines)

    return search_results, updated_files

def read_file(file_path: str) -> str:
    with open(file_path, 'r') as f:
        return f.read()

def write_file(file_path: str, content: str) -> None:
    with open(file_path, 'w') as f:
        f.write(content)

def main():
    parser = argparse.ArgumentParser(description="Search for hunks in files and optionally replace them.")
    parser.add_argument("file_path", help="Path to the file to search in")
    parser.add_argument("search_hunks", nargs="+", help="Hunks to search for")
    parser.add_argument("--replace", nargs="+", help="Hunks to replace with (if specified, must match the number of search hunks)")
    args = parser.parse_args()

    file_system = {args.file_path: read_file(args.file_path)}
    searches = {args.file_path: [[hunk] for hunk in args.search_hunks]}

    if args.replace:
        if len(args.replace) != len(args.search_hunks):
            print("Error: The number of replacement hunks must match the number of search hunks.")
            return

        replacements = {args.file_path: [[hunk] for hunk in args.replace]}
        search_results, updated_files = replace_hunks_in_files(searches, replacements, file_system)

        if any("error" in result for result in search_results.values()) or \
           any(hunk["errors"] for result in search_results.values() if "hunks" in result for hunk in result["hunks"]):
            print("Errors occurred during search. Replacement aborted.")
            print(json.dumps(search_results, indent=2))
        else:
            write_file(args.file_path, updated_files[args.file_path])
            print("Replacement successful.")
            print(json.dumps(search_results, indent=2))
    else:
        result = compare_hunks_to_files(searches, file_system)
        print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
