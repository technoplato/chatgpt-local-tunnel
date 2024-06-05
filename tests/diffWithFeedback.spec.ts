import { expect, test as it, describe } from 'bun:test'
import {
  type FileContents,
  type PatchFile,
  type PatchValidationResult,
  validatePatch,
} from './patchValidator.ts'

describe('validatePatch', () => {
  const validPatch: PatchFile = `
--- example.py
+++ example.py
@@ ... @@
-def hello():
-    print("Hello, world!")
+def hello():
+    print("Hello, Universe!")
`

  const fileContents: FileContents = {
    'example.py': `def hello():
    print("Hello, world!")`,
  }

  it('should validate a correct patch that changes a print statement', () => {
    const result: PatchValidationResult = validatePatch(
      validPatch,
      fileContents,
    )
    expect(result.isValid).toBe(true)
    expect(result.searchString).toBe(`def hello():
    print("Hello, world!")`)
    expect(result.replaceString).toBe(`def hello():
    print("Hello, Universe!")`)
  })
})
