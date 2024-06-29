import subprocess
import os

def read_file(file_path):
    with open(file_path, 'r') as file:
        return file.readlines()

def write_file(file_path, lines):
    with open(file_path, 'w') as file:
        file.writelines(lines)

def apply_changes(lines, changes):
    for line_num, new_content in changes.items():
        lines[line_num - 1] = new_content + '\n'
    return lines

def generate_diff(original_file, modified_file, diff_file):
    result = subprocess.run(['diff', '-u', original_file, modified_file], capture_output=True, text=True)
    with open(diff_file, 'w') as file:
        file.write(result.stdout)

def create_patch(original_file_path, changes):
    # Read the original file
    original_lines = read_file(original_file_path)

    # Apply the changes to the original lines
    modified_lines = apply_changes(original_lines[:], changes)

    # Write the modified lines to a new file
    modified_file_path = original_file_path.replace('.txt', '.modified.txt')
    write_file(modified_file_path, modified_lines)

    # Generate the diff
    diff_file_path = original_file_path.replace('.txt', '.patch')
    generate_diff(original_file_path, modified_file_path, diff_file_path)

    return {
        "original_file": original_file_path,
        "modified_file": modified_file_path,
        "diff_file": diff_file_path
    }

# Example usage
original_file_path = '/mnt/data/count_1_to_100.txt'
changes = {
    10: "10\tten",
    11: "11\televen",
    12: "12\ttwelve",
    13: "13\tthirteen",
    14: "14\tfourteen",
    80: "80\teighty",
    81: "81\teighty-one",
    82: "82\teighty-two",
    83: "83\teighty-three",
    84: "84\teighty-four"
}

# Create the patch
patch_info = create_patch(original_file_path, changes)

# Output the paths for inspection
patch_info
