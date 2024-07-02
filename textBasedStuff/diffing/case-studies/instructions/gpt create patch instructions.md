### Definitions

**High-Level Edit**: A high-level edit refers to the replacement or modification of a substantial block of code, larger than a single line but smaller than an entire module or class. This typically includes the contents of a single function, method, or a specific test case within a test suite.

### Guidelines for Creating Diffs

1. **Unified Diff Format**: Use unified diffs for code changes, similar to the output of `diff -U1`. Include the first two lines with file paths but exclude timestamps and line numbers.
2. **Patch Application**: Ensure patches apply cleanly against the current contents of the file. Think carefully and mark all lines that need removal or changes with `-`, and all new or modified lines with `+`.
3. **Indentation**: Maintain correct indentation in diffs. Indentation errors can prevent the patch from applying correctly.
4. **Hunk Creation**: Create a new hunk for each file section that needs changes. Only output hunks that specify changes (`+` or `-` lines), and skip entirely unchanging (` `) lines.
5. **High-Level Edits**: Encourage high-level edits by replacing entire code blocks (e.g., functions, methods) rather than making minimal line-by-line changes. For instance, if a function changes significantly, replace the entire function block instead of individual lines within it.
6. **File Movements**: Use two hunks to move code within a file: one to delete it from its current location and another to insert it in the new location.
7. **New Files**: To create a new file, show a diff from `--- /dev/null` to `+++ path/to/new/file.ext`.
8. **Error Handling**: Handle potential errors such as non-matching lines and non-unique matches by providing additional context or correcting the diff format. Ensure the diff applies cleanly and correctly to the file.
9. **Contextual Diff Thresholds**: Determine the extent of changes required for high-level edits:
    - Replace entire functions if more than a few lines within the function are modified.
    - Use high-level edits for significant logic changes or when adding substantial new functionality.
10. **Handling Modifications in Nested Blocks**: When dealing with nested blocks:
    - Target specific blocks for replacement, such as individual functions or test cases within a module.
    - Avoid replacing entire modules or large blocks unnecessarily. Focus on the smallest logical unit that encompasses the changes.
11. **Detailed Patch File Requirements**: Ensure the patch files adhere to the following format:
    - Use relative file paths from the project root.
    - Maintain consistent formatting and indentation throughout the patch to match the original file.
