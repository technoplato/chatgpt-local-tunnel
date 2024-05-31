import express from 'express'
import {
  __unsafe_getAllOwnEventDescriptors,
  type AnyActor,
  createActor,
} from 'xstate'
import { gptCoordinatorMachine } from './src/gptCoordinator/gptCoordinatorMachine.ts'
import * as fs from 'fs'
import { exec } from 'child_process'
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

const app = express()
app.use(express.json())

const port = 3000

const externalProjectPath = '/usr/src/project'

const actor = createActor(gptCoordinatorMachine)
actor.start()

app.get('/machineState', (req, res) => {
  const state = actor.getSnapshot().value
  const nextEvents = __unsafe_getAllOwnEventDescriptors(
    actor.getSnapshot()
  )
  const context = actor.getSnapshot().context

  res.send({
    state,
    context,
    nextEvents,
  })
})

app.post('/machineSend', (req, res) => {
  const command = req.body.command
  logger.info()
  actor.send({ type: command })
  const snapshot = actor.getSnapshot()
  const nextEvents = __unsafe_getAllOwnEventDescriptors(
    actor.getSnapshot()
  )

  const meta = snapshot.getMeta()
  const hintsForGpt = meta.hintsForGpt
  logger.info()
  res.send({
    state: snapshot.value,
    context: snapshot.context,
    hints: hintsForGpt,
    nextEvents,
  })
})

app.post('/run-command', async (req, res) => {
  const { command, commitMessage } = req.body
  logger.info('-------------------------------------------------------------')
  logger.info()
  logger.info()
  logger.info('-------------------------------------------------------------')
  if (!command || !commitMessage) {
    logger.error('Command and commit message are required')
    return res
      .status(400)
      .json({ error: 'Command and commit message are required' })
  }

  if (!fs.existsSync(externalProjectPath)) {
    logger.error()
    return res.status(400).json({
      error: ,
    })
  }

  exec(
    command,
    { cwd: externalProjectPath },
    async (err, stdout, stderr) => {
      if (err) {
        logger.error('Command execution error', { stderr })
        return res.status(500).json({ error: stderr })
      }

      try {
        logger.info('Command executed and changes committed successfully', { stdout })
        res.json({
          message: 'Command executed and changes committed successfully',
          output: stdout,
        })
      } catch (error) {
        logger.error('Git commit error', { error: error.message })
        res.status(500).json({ error })
      }
    }
  )
})

app.get('/', (req, res) => {
  res.send('Hello, World!')
})

app.listen(port, () => {
  logger.info()
})
