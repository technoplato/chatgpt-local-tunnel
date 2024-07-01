import express from 'express'
import dotenv from 'dotenv'
import { logger } from './logging.ts'
import { checkUserAndRestoreState } from './middlewares/checkUserAndRestoreState.ts'
import { machineStateHandler } from './routes/machineState.ts'
import { machineSendHandler } from './routes/machineSend.ts'
import { runCommandHandler } from './routes/runCommand.ts'

dotenv.config()
logger.info('Server started and logger initialized.')

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.use(checkUserAndRestoreState)

app.get('/machineState', machineStateHandler)
app.post('/machineSend', machineSendHandler)
app.post('/run-command', runCommandHandler)

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

const port = 3000
app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
