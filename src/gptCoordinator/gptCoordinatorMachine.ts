import { assign, log, setup } from 'xstate'
import { envParsedWithTypes } from '../../ENV/env.config.ts'

interface CoordinatorMachineContext {
  gptContextWindow: string
  filesPaths: string[]
  containerProjectLocation: string
}

interface CoordinatorMachineEvents {
  type: 'gpt.firstContact' | 'gpt.understandsFileStructure'
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
      description: `
GPT initializing:

The server or state machine doesn't initially know the states of the
user or GPT. There are multiple states the user might be in, but we
won't receive events from most of these states, since the GPT is 
not yet connected to the GPT.

When the user opens our GPT, if their server is already running,
they can start communicating with it immediately. We'll receive a
planned alive check from the GPT. If the server is alive, we'll get
the alive event and transition to a connected state, enabling
communication with the GPT.

If the user needs to set up, we'll prompt them to install Docker if
they prefer not to expose their local machine directly. After that,
they'll run the start script, obtain an ngrok token, and specify an
ngrok subdomain.

We'll expect a health check action to verify the server's status. If
the server is up, we'll transition to the connected state. In the
rare case where the server isn't running and a health check is
performed, the GPT won't receive the event.
`,
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
      description: `
The GPT has successfully shown that it can connect to the server.
This means the user has run the Docker image and has successfully
set up ngrok. We now have a tunnel to the custom GPT that has access
to whatever directory the user specified when they invoked the start
script.

Now, the GPT should attempt to run a command to list the top-level
files in the user's directory to figure out what kind of project
this is. This is going to be an iterative process, so we're going to
expect the GPT to continue to send us commands to run, establishing
the project type and the general directory structure.

Keep in mind that the GPT has a size limit for responses of
approximately 50,000 characters or tokens. We need to be mindful of
not sending too many tokens in our responses.

We expect the GPT to send one list command, then decide the next
command to run, iteratively listing our files.
`,
      on: {
        'gpt.understandsFileStructure': {
          target: 'GptPlanning',
        },
      },
      meta: {
        hintsForGpt: `
1. **Initiate Exploration**:
   - Begin by listing all files from ${envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION} to understand the
     project's structure.

2. **Identify Project Type**:
   - Look for indicative files like \`package.json\` for JavaScript
     projects or \`cargo.toml\` for Rust projects, as examples.

3. **Find Lock Files**:
   - Check for lock files such as \`package-lock.json\`, \`yarn.lock\`,
     or \`bun.lock\` if it's a JavaScript project.

4. **Examine Key Files**:
   - Consider reading key files like \`package.json\` or \`cargo.toml\`
     to gather project-specific information.

5. **Explore Source Directory**:
   - Investigate the structure and contents of directories like the
     source directory to understand the code layout.

6. **Iterative Interaction**:
   - Ask users about unfamiliar or interesting files and run
     additional commands based on the user's response.
   - Feel free to explore the file structure of the source directory
     and ask the user if there are specific files they'd like to work with
   - Use find commands to find the absolute path of those files

7. **Avoid Sensitive Files**:
   - Avoid reading environment files such as \`.env\` files.

8. **Conclude Understanding**:
   - Once confident about the project's details (e.g., "React Native
     app using TypeScript and build tool XYZ"), suggest sending the
     \`gpt.understandsFileStructure\` event to \`machineSend\`.
`,
      },
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
