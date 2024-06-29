import json
from typing import Dict, List, Union, TypedDict
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

def read_file(file_path: str) -> str:
    with open(file_path, 'r') as f:
        return f.read()

def main():
    parser = argparse.ArgumentParser(description="Search for hunks in files.")
    parser.add_argument("file_path", help="Path to the file to search in")
    parser.add_argument("hunks", nargs="+", help="Hunks to search for")
    args = parser.parse_args()

    file_system = {args.file_path: read_file(args.file_path)}
    searches = {args.file_path: [[hunk] for hunk in args.hunks]}

    # Example of how to pass a multi-line hunk with quotes from the command line:
    # python hunk_search.py path/to/your/file.txt "def example_function():
    #     print(\"This is a multi-line hunk\")
    #     print('It contains both \"double\" and \'single\' quotes')
    #     return None"

    result = compare_hunks_to_files(searches, file_system)
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()