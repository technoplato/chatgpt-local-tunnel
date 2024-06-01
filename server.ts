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
      filename: 'error.log',
      level: 'error',
    }),
    new winston.transports.File({ filename: 'combined.log' }),
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

const app = express()
app.use(express.json())

const port = 3000

const externalProjectPath = '/usr/src/project'

const actor = createActor(gptCoordinatorMachine)
actor.start()

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
  const payload = getActorPayload(actor)
  logger.info('Fetched machine meta', { meta: payload.hintsForGpt })
  logger.info('Fetched machine state', {
    state: payload.state,
    context: payload.context,
  })

  res.send(payload)
})

app.post('/machineSend', (req, res) => {
  const command = req.body.command
  if (!command) {
    logger.warn('No command provided in /machineSend request')
    return res.status(400).json({ error: 'Command is required' })
  }
  logger.info('Received command for machineSend', { command })

  actor.send({ type: command })
  logger.info('Sent command for machineSend', { command })

  const payload = getActorPayload(actor)
  logger.info('Processed command for machineSend', {
    state: payload.state,
  })

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

  if (!fs.existsSync(externalProjectPath)) {
    logger.error('External project path does not exist', {
      path: externalProjectPath,
    })
    return res
      .status(400)
      .json({ error: 'External project path does not exist' })
  }

  exec(
    command,
    { cwd: externalProjectPath },
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

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
