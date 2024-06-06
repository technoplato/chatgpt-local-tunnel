import express from 'express'
import fs from 'fs'
import { exec } from 'child_process'
import winston from 'winston'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

// Custom log format
const customFormat = winston.format.printf(
  ({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`
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

const app = express()
app.use(express.json())

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.post('/encodedPatchFile', (req, res) => {
  const { encodedPatchFile, filePath } = req.body
  if (!encodedPatchFile || !filePath) {
    logger.error('encodedPatchFile and filePath are required')
    return res
      .status(400)
      .json({ error: 'encodedPatchFile and filePath are required' })
  }

  const buffer = Buffer.from(encodedPatchFile, 'base64')
  const tempPatchFilePath = `${filePath}.patch`
  fs.writeFileSync(tempPatchFilePath, buffer)

  exec(
    `patch ${filePath} ${tempPatchFilePath}`,
    (error, stdout, stderr) => {
      if (error) {
        logger.error(`Error applying patch: ${stderr}`)
        return res
          .status(500)
          .json({ error: 'Failed to apply patch', stderr })
      }
      fs.unlinkSync(tempPatchFilePath)
      logger.info(`File patched successfully at ${filePath}`)
      res.json({
        message: `File patched successfully at ${filePath}`,
      })
    },
  )
})

app.post('/files', async (req, res) => {
  const { files } = req.body
  if (!files || !Array.isArray(files)) {
    logger.error('Files are required and must be an array')
    return res
      .status(400)
      .json({ error: 'Files are required and must be an array' })
  }

  try {
    for (const file of files) {
      const { path, content, download_link } = file
      if (download_link) {
        const response = await axios.get(download_link, {
          responseType: 'arraybuffer',
        })
        fs.writeFileSync(path, response.data)
      } else {
        fs.writeFileSync(path, content, 'utf8')
      }
      logger.info(`File written: ${path}`)
    }
    res.json({ message: 'Files written successfully' })
  } catch (error) {
    logger.error('Error writing files', { error })
    res.status(500).json({ error })
  }
})

const port = 3000
app.listen(port, () => {
  logger.info('Server is running on port ' + port)
})
