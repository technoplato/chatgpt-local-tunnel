// import { validatePatch } from '../code/patchValidator'
// import { readFileSync } from 'fs'
// import { join } from 'path'
// import { clearTerminal } from '../../tests/utils.ts'
//
// beforeAll(async () => {
//   // console.log('start test')
//   // console.log(proccess.env)
//   // await clearTerminal()
//   // await new Promise((resolve) => setTimeout(resolve, 140))
// })
//
// describe('Patch Validator', () => {
//   it('should validate README patch', () => {
//     const baseFilePath = join(
//       __dirname,
//       '../case-studies/example1/readme.md/base.README.md',
//     )
//     const patchFilePath = join(
//       __dirname,
//       '../case-studies/example1/readme.md/u10-GPT.README.md.patch',
//     )
//
//     const baseContent = readFileSync(baseFilePath, 'utf-8')
//     const patchContent = readFileSync(patchFilePath, 'utf-8')
//
//     const fileContents = {
//       'project/diffing-casestudies/example1/readme.md/base.README.md':
//         baseContent,
//     }
//     const { isValid, errors, searchString, originalContent } =
//       validatePatch(patchContent, fileContents)[0]
//
//     console.log(`
//
// originalContent
// ${originalContent}
//
// ---------------------------------------------------------
//
// searchString
// ${searchString}
//
//
//
// is valid: ${isValid}
//
//     `)
//   })
// })
