import express from 'express'
import {
  __unsafe_getAllOwnEventDescriptors,
  type ActorRef,
  type ActorRefFrom,
  type AnyActor,
  createActor,
} from 'xstate'
import {
  gptCoordinatorMachine,
  GptCoordinatorMachineId,
} from './src/gptCoordinator/gptCoordinatorMachine.ts'
import * as fs from 'fs'
import { exec } from 'child_process'
import dotenv from 'dotenv'
import { envParsedWithTypes } from './ENV/env.config.ts'
import axios from 'axios'
import { logger } from './logging.ts'

dotenv.config()

logger.info('Server started and logger initialized.')
const app = express()
app.use(express.json())

const getPersistentSnapshot = (userId: string) => {
  const snapshotPath = `sessions/${userId}`
  if (fs.existsSync(snapshotPath)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
    return snapshot
  }
  return null
}

const savePersistentSnapshot = (userId: string, snapshot: any) => {
  const snapshotPath = `sessions/${userId}`
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8')
}

const getActorPayload = (
  actor: ActorRefFrom<typeof gptCoordinatorMachine>,
) => {
  const snapshot = actor.getSnapshot()
  const state = snapshot.value
  const nextEvents = __unsafe_getAllOwnEventDescriptors(snapshot)
  const context = snapshot.context
  const metaMap = snapshot.getMeta()

  const stateValueString = snapshot._nodes
    .filter((s) => s.type === 'atomic' || s.type === 'final')
    .map((s) => s.id)
    .join(', ')
    .split('.')
    .slice(1)
    .join('.')

  logger.info('stateValueString', { stateValueString })

  const metakey = `${GptCoordinatorMachineId}.${stateValueString}`

  const stateMeta = metaMap[metakey]?.hintsForGpt ?? ''
  const topLevelMeta =
    metaMap[GptCoordinatorMachineId]?.hintsForGpt ?? ''

  const header = `
  \\n---------------------------------------------------------\\n
  Hints for this entire process:
  \\n---------------------------------------------------------\\n
  `

  const divider = `
  \\n---------------------------------------------------------\\n
  Hints specific to this state: ${stateValueString}
  \\n---------------------------------------------------------\\n
  `
  const combinedHintsForGpt =
    header + topLevelMeta + divider + stateMeta

  return {
    state,
    context,
    nextEvents,
    hintsForGpt: combinedHintsForGpt,
  }
}

app.get('/machineState', (req, res) => {
  const userId = req.headers['openai-ephemeral-user-id'] as string
  if (!userId) {
    logger.warn('No user ID provided in request headers')
    return res.status(400).json({ error: 'User ID is required' })
  }

  // Log basic request details
  logger.info('Received /machineState request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
  })

  const restoredState = getPersistentSnapshot(userId)
  const actor = createActor(gptCoordinatorMachine, {
    input: {
      containerProjectLocation:
        process.env.USER_PROJECT_CONTAINER_LOCATION,
    },
    ...(restoredState && { snapshot: restoredState }),
  }).start()
  logger.info(
    `Machine state before sending command: ${JSON.stringify(actor.getSnapshot())}`,
  )
  logger.info(
    `Machine state after /machineState: ${JSON.stringify(actor.getSnapshot())}`,
  )

  const payload = getActorPayload(actor)

  // Log details about the fetched payload
  logger.info('Fetched machine meta', { meta: payload.hintsForGpt })
  logger.info('Fetched machine state', {
    state: payload.state,
    context: payload.context,
  })

  // Persist the snapshot after processing the request
  const persistedState = actor.getPersistedSnapshot()
  savePersistentSnapshot(userId, persistedState)

  res.send(payload)
})

app.post('/machineSend', (req, res) => {
  const userId = req.headers['openai-ephemeral-user-id'] as string
  if (!userId) {
    logger.warn('No user ID provided in request headers')
    return res.status(400).json({ error: 'User ID is required' })
  }

  const command = req.body.command
  if (!command) {
    logger.warn('No command provided in /machineSend request')
    return res.status(400).json({ error: 'Command is required' })
  }
  logger.info('Received command for machineSend', { command })

  const restoredState = getPersistentSnapshot(userId)
  const actor = createActor(gptCoordinatorMachine, {
    input: {
      containerProjectLocation:
        process.env.USER_PROJECT_CONTAINER_LOCATION,
    },
    ...(restoredState && { snapshot: restoredState }),
  }).start()
  logger.info(
    `Machine state before sending command: ${JSON.stringify(actor.getSnapshot())}`,
  )
  logger.info(
    `Machine state after /machineState: ${JSON.stringify(actor.getSnapshot())}`,
  )

  actor.send({ type: command })
  logger.info(
    `Machine state after sending command: ${JSON.stringify(actor.getSnapshot())}`,
  )
  logger.info('Sent command for machineSend', { command })

  const payload = getActorPayload(actor)
  logger.info('Processed command for machineSend', {
    state: payload.state,
  })

  // Log details about the fetched payload
  logger.info('Fetched machine meta', { meta: payload.hintsForGpt })

  // Persist the snapshot after processing the request
  const persistedState = actor.getPersistedSnapshot()
  savePersistentSnapshot(userId, persistedState)

  res.send(payload)
})

app.post('/run-command', async (req, res) => {
  const { command, commitMessage } = req.body
  logger.info('Received /run-command request', {
    command,
    commitMessage,
  })

  if (!command) {
    logger.error('Command and commit message are required')
    return res
      .status(400)
      .json({ error: 'Command and commit message are required' })
  }

  if (
    !fs.existsSync(envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION)
  ) {
    logger.error('External project path does not exist', {
      path: envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION,
    })
    return res
      .status(400)
      .json({ error: 'External project path does not exist' })
  }

  exec(
    command,
    { cwd: envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION },
    (err, stdout, stderr) => {
      // if (stderr) {
      //   logger.error('Command execution error', {
      //     stderr,
      //     stdout,
      //     err,
      //   })
      // }

      exec(
        'git diff',
        { cwd: envParsedWithTypes.USER_PROJECT_CONTAINER_LOCATION },
        (diffErr, diffStdout, diffStderr) => {
          if (diffStderr) {
            logger.error('Git diff error', {
              diffStderr,
              diffStdout,
              diffErr,
            })
            return res.status(500).json({
              error: diffStderr,
              output: diffStdout,
              err: diffErr,
            })
          }

          res.json({
            message:
              'Command executed, please observe output to determine success',
            output: stdout,
            gitDiff: diffStdout,
            stderr,
            error,
            err,
          })
        },
      )
    },
  )
})

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

interface OpenAIFileIdRef {
  name: string
  id: string
  mime_type: string
  download_link: string
}

const port = 3000
app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
