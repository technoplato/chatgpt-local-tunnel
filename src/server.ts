import express from 'express'
import dotenv from 'dotenv'
import { machineStateHandler } from './routes/machineState.ts'
import { machineSendHandler } from './routes/machineSend.ts'
import { runCommandHandler } from './routes/runCommand.ts'
import { checkUserAndRestoreState } from './middlewares/checkUserAndRestoreState.ts'
import { logger } from './logging.ts'

dotenv.config()
logger.info('Server started and logger initialized.')

const app = express()
app.use(express.json())

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
