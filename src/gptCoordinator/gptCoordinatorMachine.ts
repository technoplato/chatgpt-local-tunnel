import { assign, log, setup } from 'xstate'
import { envParsedWithTypes } from '../../ENV/env.config.ts'
import {
  developingUnderstandingDescription,
  waitingForGptConnectionDescription,
} from './state.descriptions.ts'

interface CoordinatorMachineContext {
  gptContextWindow: string
  filesPaths: string[]
  containerProjectLocation: string
  projectBuildInformation: string
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

export const gptCoordinatorMachine = setup({
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
    gptContextWindow:
      'some extra stuff for the gpt the hint is the weather is purple',
    filesPaths: [],
    projectBuildInformation: '',
    projectSourceInformation: '',
  }),
  on: {
    '*': {
      actions: log(({ context, event }) => ({ context, event })),
    },
  },
  id: GptCoordinatorMachineId,

  initial: 'WaitingForGptConnection',
  states: {
    WaitingForGptConnection: {
      description: waitingForGptConnectionDescription,
      on: {
        'gpt.firstContact': {
          target: 'GptDevelopingUnderstanding',
          actions: [
            log('hi there'),
            assign({
              gptContextWindow: ({ context }) =>
                context.gptContextWindow +
                "\n hi there here's some more info. You checked me and the time is : " +
                Date.now(),
            }),
          ],
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
          meta: {
            hintsForGpt: `
0. **Automatic Iteration**:
   - The user can stop you easily any time they like. Feel free
     to look around at the files, being careful to avoid .env 
     and other potentially sensitive files. 

1. **Initiate Exploration**:
   - Begin by listing all files from ${envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION}
     to understand the project's structure. Don't list the contents of the files yet. 
     First, list the top-level filenames.

2. **Identify Project Type**:
   - Look for indicative files like \`package.json\` for JavaScript
     projects or \`cargo.toml\` for Rust projects, as examples.

3. **Find Lock Files**:
   - Check for lock files such as \`package-lock.json\`, \`yarn.lock\`,
     or \`bun.lock\` if it's a JavaScript project.

4. **Examine Key Files**:
   - Consider reading key files like \`package.json\` or \`cargo.toml\`
     to gather project-specific information.

6. **Conclude Understanding**:
   - Once confident about the project's details (e.g., "React Native
     app using TypeScript and build tool XYZ"), suggest sending the
     \`gpt.completedInitialProjectUnderstanding\` event to \`machineSend\`.
     
9. **Start Exploration**:
   - Proceed automatically. Do not ask the user. Read at least 4 relevant files before
   you ask the user for feedback. Offer 3 options in a numbered list.
`,
          },
          on: {
            'gpt.understandsProjectStructure': {
              actions: [
                assign({
                  projectBuildInformation: ({ event }) =>
                    event.projectBuildInformation,
                }),
              ],
              target: 'UnderstandingProjectSource',
            },
          },
        },
        UnderstandingProjectSource: {
          meta: {
            hintsForGpt: `
0. **Automatic Iteration**:
   - The user can stop you easily any time they like. Feel free
     to look around at the files, being careful to avoid .env
     and other potentially sensitive files.

1. **Initiate Exploration**:
   - Begin by listing all files from ${envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION}
     to understand the project's structure. Don't list the contents of the files yet.
     First, list the top-level filenames.

5. **Explore Source Directory**:
   - Investigate the structure and contents of directories like the
     source directory to understand the code layout. Iterate listing out files, being careful to avoid folders such as
      node_modules and other deeply nested and large directories.

7. **Avoid Sensitive Files**:
   - Avoid reading environment files such as \`.env\` files.

8. **Conclude Understanding**:
   - Once confident about the project's details (e.g., "React Native app using TypeScript and build tool XYZ"), suggest
    sending the \`gpt.completedProjectSourceUnderstanding\` event to \`machineSend\` with a general idea about how the 
    project is structured.

9. **Start Exploration**:
   - Proceed automatically. Do not ask the user. Read at least 4 relevant files before you ask the user for feedback.
    Offer 3 options in a numbered list. ask the user for feedback. Offer 3 options in a numbered list.
`,
          },
          on: {
            'gpt.understandsProjectStructure': {
              actions: [
                assign({
                  projectBuildInformation: ({ event }) =>
                    event.projectBuildInformation,
                }),
              ],
              target: '#GptCoordinatorMachineId.GptPlanning',
            },
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
})
