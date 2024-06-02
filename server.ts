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
import winston from 'winston'
import dotenv from 'dotenv'
import { envParsedWithTypes } from './ENV/env.config.ts'
import axios from 'axios'

dotenv.config()

// Custom log format
const customFormat = winston.format.printf(
  ({ level, message, timestamp, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`
  },
)

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat,
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        customFormat,
      ),
    }),
  )
}

logger.info('Server started and logger initialized.')
const app = express()
app.use(express.json())

const port = 3000

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

  const metakey = `${GptCoordinatorMachineId}.${actor.getSnapshot().value}`
  const stateMeta = metaMap[metakey]

  const hintsForGpt = stateMeta?.hintsForGpt ?? ''

  return {
    state,
    context,
    nextEvents,
    hintsForGpt,
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
      if (err) {
        logger.error('Command execution error', { stderr })
        return res.status(500).json({ error: stderr })
      }

      logger.info(
        'Command executed and changes committed successfully',
        { stdout },
      )
      res.json({
        message:
          'Command executed and changes committed successfully',
        output: stdout,
      })
    },
  )
})

// app.post('/files', async (req, res) => {
//   const { files } = req.body
//   logger.info('Received /files request', { files })
//
//   if (!files || !Array.isArray(files)) {
//     logger.error('Files are required and must be an array')
//     return res
//       .status(400)
//       .json({ error: 'Files are required and must be an array' })
//   }
//
//   files.forEach((file) => {
//     const { path, content } = file
//     if (!path || !content) {
//       logger.error('Each file must have a path and content')
//       return res
//         .status(400)
//         .json({ error: 'Each file must have a path and content' })
//     }
//
//     fs.writeFileSync(path, content, 'utf8')
//     logger.info(`File written: ${path}`)
//   })
//
//   res.json({
//     message: 'Files written successfully',
//   })
// })

app.post('/files', async (req, res) => {
  const openaiFileIdRefs = req.body.openaiFileIdRefs

  logger.info('Received /files request', { openaiFileIdRefs })

  if (!openaiFileIdRefs || !Array.isArray(openaiFileIdRefs)) {
    logger.error('openaiFileIdRefs are required and must be an array')
    return res.status(400).json({
      error: 'openaiFileIdRefs are required and must be an array',
    })
  }

  if (openaiFileIdRefs.length === 0) {
    logger.error('openaiFileIdRefs array is empty')
    return res.status(400).json({
      error: 'openaiFileIdRefs array is empty',
    })
  }

  try {
    for (const file of openaiFileIdRefs) {
      const { name, id, mime_type, download_link } = file

      // Download the file content from the URL if download_link is provided
      if (download_link) {
        const response = await axios.get(download_link, {
          responseType: 'arraybuffer',
        })
        fs.writeFileSync(name, response.data)
        logger.info(`File downloaded and written: ${name}`)
      } else {
        // Write the content directly to the specified name
        fs.writeFileSync(name, file.content)
        logger.info(`File written: ${name}`)
      }
    }
    res.json({ message: 'Files written successfully' })
    logger.info('Files written successfully')
  } catch (error) {
    logger.error('Error writing files', { error })
    res.status(500).json({ error })
  }
})

app.post('/createWidget', async (req, res) => {
  const openaiFileIdRefs = req.body.openaiFileIdRefs

  logger.info('Received /createWidget request', { openaiFileIdRefs })

  if (!openaiFileIdRefs || !Array.isArray(openaiFileIdRefs)) {
    logger.error('openaiFileIdRefs are required and must be an array')
    return res.status(400).json({
      error: 'openaiFileIdRefs are required and must be an array',
    })
  }

  if (openaiFileIdRefs.length === 0) {
    logger.error('openaiFileIdRefs array is empty')
    return res.status(400).json({
      error: 'openaiFileIdRefs array is empty',
    })
  }

  // try {
  //   for (const file of openaiFileIdRefs) {
  //     const { path, name, id, mime_type, download_link } = file
  //
  //     // Download the file content from the URL if download_link is provided
  //     if (download_link) {
  //       const response = await axios.get(download_link, {
  //         responseType: 'arraybuffer',
  //       })
  //       fs.writeFileSync(path, response.data)
  //       logger.info(`File downloaded and written: ${path}`)
  //     } else {
  //       // Write the content directly to the specified path
  //       fs.writeFileSync(path, file.content)
  //       logger.info(`File written: ${path}`)
  //     }
  //   }
  //   res.json({ message: 'Files written successfully' })
  //   logger.info('Files written successfully')
  // } catch (error) {
  //   logger.error('Error writing files', { error })
  //   res.status(500).json({ error })
  // }
})

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
