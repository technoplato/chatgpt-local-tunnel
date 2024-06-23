import { and, assign, log, setup } from 'xstate'
import { envParsedWithTypes } from '../../ENV/env.config.ts'
import {
  developingUnderstandingDescription,
  waitingForGptConnectionDescription,
} from './state.descriptions.ts'

interface CoordinatorMachineContext {
  filesPaths: string[]
  containerProjectLocation: string
  projectBuildInformation: string
  userGoals: string
  projectSourceInformation: string
}

type CoordinatorMachineEvents =
  | { type: 'gpt.firstContact' }
  | {
      type: 'gpt.completedInitialProjectUnderstanding'
    }
  | {
      type: 'gpt.understandsProjectStructure'
      projectBuildInformation: string
    }
  | {
      type: 'gpt.understandsUserGoals'
      userGoals: string
    }
  | {
      type: 'gpt.completedProjectSourceUnderstanding'
      projectSourceInformation: string
    }

interface CoordinatorMachineMeta {
  hintsForGpt: string
}

interface CoordinatorMachineInput {
  containerProjectLocation: string
}

export const GptCoordinatorMachineId = 'GptCoordinatorMachineId'

export const coordinatorMachine = setup({
  types: {
    context: {} as CoordinatorMachineContext,
    events: {} as CoordinatorMachineEvents,
    meta: {} as CoordinatorMachineMeta,
    input: {} as CoordinatorMachineInput,
  },
  actions: {},
}).createMachine({
  context: ({ input }) => ({
    containerProjectLocation: input.containerProjectLocation,
    filesPaths: [],
    projectBuildInformation: '',
    projectSourceInformation: '',
    userGoals: '',
  }),
  id: GptCoordinatorMachineId,

  initial: 'WaitingForGptConnection',
  states: {
    WaitingForGptConnection: {
      description: waitingForGptConnectionDescription,
      on: {
        'gpt.firstContact': {
          target: 'GptDevelopingUnderstanding',
        },
      },
      meta: {
        hintsForGpt: `
GPT will never receive hints in this state because
the GPT is not yet established communication with the server. 
`,
      },
    },

    GptDevelopingUnderstanding: {
      initial: 'UnderstandingProjectStructure',
      states: {
        UnderstandingProjectStructure: {
          on: {
            'gpt.understandsProjectStructure': {
              actions: [
                assign({
                  projectBuildInformation: ({ event }) =>
                    event.projectBuildInformation,
                }),
              ],
              target: 'UnderstandingUserGoals',
            },
          },

          meta: {
            hintsForGpt: `

 **Automatic Iteration**:
   - The user can stop you easily any time they like. Feel free
     to look around at the files, being careful to avoid .env 
     and other potentially sensitive files. 

 **Initiate Exploration**:
   - Begin by listing all files from ${envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION}
     to understand the project's structure. Don't list the contents of the files yet. 
     First, list the top-level filenames. Don't list all files recursively as you will
     run into file count limits with directories such as node_modules.

 **Identify Project Type**:
   - Look for indicative files like \`package.json\` for JavaScript
     projects or \`cargo.toml\` for Rust projects, as examples.

 **Find Lock Files**:
   - Check for lock files such as \`package-lock.json\`, \`yarn.lock\`,
     or \`bun.lock\` if it's a JavaScript project.

 **Examine Key Files**:
   - Consider reading key files like \`package.json\` or \`cargo.toml\`
     to gather project-specific information.

 **Conclude Understanding**:
   - Once confident about the project's details (e.g., "React Native
     app using TypeScript and build tool XYZ"), suggest sending the
     \`gpt.understandsProjectStructure\` event to \`machineSend\
     with a payload containing projectBuildInformation that describes
     what this project is, what build tools, what runtimes, what
      its key dependencies are, what build tools are used, etc

 **Start Exploration**:
   - Proceed automatically. Do not ask the user. Read at least 4 relevant files before
   you ask the user for feedback. Offer 3 options in a numbered list.
   - DO NOT ASK THE USER FOR FEEDBACK BEFORE YOU START EXPLORING. GO!
`,
          },
        },

        UnderstandingUserGoals: {
          on: {
            'gpt.understandsUserGoals': {
              actions: [
                assign({
                  userGoals: ({ event }) => event.userGoals,
                }),
              ],
              target: '#GptCoordinatorMachineId.GptPlanning',
            },
          },
          meta: {
            hintsForGpt: `
If the user has not provided any goals, you can ask them to provide some.
Your goal is to ask elaborating questions about the user's goals and then
break them down into smaller, achievable tasks. 

Once you have a set of goals, list them out in a bulleted list.

Once the user approves that list, send the \`gpt.understandsUserGoals\` event to \`machineSend\`
with a payload containing the list of goals.
`,
          },
        },
      },
      description: developingUnderstandingDescription,
    },

    GptPlanning: {
      description: `
The GPT is now planning the work based on the user's specifications,
directory structure, and project type. This involves creating a branch name,
outlining a series of hypothetical commits with detailed descriptions,
and specifying tests to verify each change.
`,
      on: {},
      meta: {
        hintsForGpt: `
1. **Collect Plan from User**:
   - Ask the user what they'd like to accomplish in this session.
   - Collect detailed specifications and requirements for the planned changes.

2. **Propose Branch Name**:
   - Based on the user's plan, propose a branch name that reflects the feature or fix.

3. **Outline Hypothetical Commits**:
   - Create a series of hypothetical commits in a bulleted list.
   - Each commit should have a brief description of the changes.

4. **Specify Current and Expected State**:
   - Detail the current state of the repository and files of interest.
   - Describe the expected state of these files after each commit.

5. **Detail Tests**:
   - Outline the tests that will be written and performed manually.
   - Ensure that each bullet point includes tests to verify the functionality.

6. **Create Plan in Repository**:
   - Create a \`plans\` directory at the top level of the project source directory.
   - Write the plan as a markdown file with checklist items for each bullet point.

7. **Verify Tests Before Committing**:
   - Do not commit changes until all tests for each bullet point are verified.

Example Structure for Plan:
\`\`\`markdown
# Plan for Feature XYZ

## Branch Name
- \`feature/xyz-implementation\`

## Hypothetical Commits
- [ ] **Commit 1**: Setup initial project structure
  - Description: Create initial project structure with necessary files.
  - Tests: Verify directory creation and initial file setup.

- [ ] **Commit 2**: Implement feature part 1
  - Description: Add functionality for part 1 of the feature.
  - Tests: Write unit tests and perform manual tests to ensure part 1 works as expected.

## Current and Expected State
- **Current State**: List of current files and their states.
- **Expected State**: List of expected files and their states after each commit.

## Tests
- [ ] **Test 1**: Verify initial setup
- [ ] **Test 2**: Verify functionality of part 1
\`\`\`
`,
      },
    },
  },
  //   meta: {
  //     hintsForGpt: `
  // Whenever you need to make modifications to the project,
  // you can use the \`encodedPatchFile\` action to send a patch file to the GPT.
  //
  // The patch file should be a base64 encoded string that contains the changes to the project.
  //
  // For example, if you want to add a new file to the project, you can use the \`encodedPatchFile\`
  //  action to send a patch file that adds the new file to the project.
  //
  // If you want to modify an existing file, you can use the \`encodedPatchFile\` action to
  // send a patch file that modifies the existing file.
  //
  // Here are explicit instructions of the entire process:
  //
  // 1. **Identify the Target File and Desired Change:**
  //    - Based off user instructions, identify the target files and desired
  //      changes.
  //    - Example: Identified \`foo.txt\` as the target file and desired to add
  //      \`11\` after \`10\`.
  //
  // 2. **Simulate the Patch File Creation:**
  //    - Craft a minimal patch file to represent the change.
  //    - Specify the old file (\`foo.txt\`) and new file (\`foo.txt\`) in the
  //      header.
  //    - Include only necessary context around the change.
  //
  // 3. **Simulate the Construction of the Patch File:**
  //    - Use the following format:
  //      \`\`\`diff
  //      --- foo.txt
  //      +++ foo.txt
  //      @@ -8,3 +8,4 @@
  //       8
  //       9
  //       10
  //      +11
  //      \`\`\`
  //
  // 4. **Ensure Minimal Context:**
  //    - Include only necessary lines surrounding the change.
  //
  // 5. **Encode the Patch File in Base64:**
  //    - Encode the patch file in Base64 using your local Python environment:
  //      \`\`\`python
  //      import base64
  //
  //      patch_content = """--- foo.txt
  //      +++ foo.txt
  //      @@ -8,3 +8,4 @@
  //       8
  //       9
  //       10
  //      +11
  //      """
  //      encoded_patch = base64.b64encode(patch_content.encode('utf-8')).decode('utf-8')
  //      print(encoded_patch)
  //      \`\`\`
  //    - The Base64 encoded output should be:
  //      \`\`\`
  //      LS0tIGZvby50eHQKKysrIGZvby50eHQKQEAgLTgsMyArOCw0IEBACiA4CiA5CiAxMAorMTEK
  //      \`\`\`
  //
  // 6. **Invoke the Encoded Patch File Action:**
  //    - Invoke the \`encodedPatchFile\` action with the encoded patch file and
  //      the target file path:
  //      \`\`\`json
  //      {
  //        "encodedPatchFile": "LS0tIGZvby50eHQKKysrIGZvby50eHQKQEAgLTgsMyArOCw0IEBACiA4CiA5CiAxMAorMTEK",
  //        "filePath": "/usr/src/project/foo.txt"
  //      }
  //      \`\`\`
  //
  // 7. **Confirm the Patch was Applied:**
  //    - Ensure the file is successfully patched.
  // `,
  //   },
})
