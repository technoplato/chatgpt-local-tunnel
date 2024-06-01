import { assign, log, setup } from 'xstate'

interface CoordinatorMachineContext {
  gptContextWindow: string
  filesPaths: string[]
}

interface CoordinatorMachineEvents {
  type: 'gpt.firstContact' | 'gpt.understandsFileStructure'
}

interface CoordinatorMachineMeta {
  hintsForGpt: string
}

export const gptCoordinatorMachine = setup({
  types: {
    context: {} as CoordinatorMachineContext,
    events: {} as CoordinatorMachineEvents,
    meta: {} as CoordinatorMachineMeta,
  },
  actions: {},
}).createMachine({
  context: {
    gptContextWindow:
      'some extra stuff for the gpt the hint is the weather is purple',
    filesPaths: [],
  },
  on: {
    '*': {
      actions: log(({ context, event }) => ({ context, event })),
    },
  },
  id: 'gptCoordinatorMachineId',

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
Hints for GPT:

- Attempt to run a command to list the top-level files in the user's
  directory.
- Make decisions iteratively based on the directory contents.
- Establish the type of project and the general directory structure.
- Keep responses within the size limit of approximately 50,000
  characters or tokens.
- Continue sending commands until the project structure is fully
  understood.
- Once you understand the contents of the project, send the 
  gpt.understandsFileStructure event to the machineSend endpoint
`,
      },
    },

    GptPlanning: {
      description: `

`,
      on: {
        'gpt.understandsFileStructure': {
          target: 'GptDevelopingUnderstanding',
        },
      },
      meta: {
        hintsForGpt: `
You should be planning your work based off the user's 
specifications, directory structure and project type.

Don't run any commands or output any code until the 
user has confirmed they agree. 

You need to create a branch name for the work 
`,
      },
    },
  },
})
