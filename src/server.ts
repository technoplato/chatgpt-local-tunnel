import express from 'express'
import dotenv from 'dotenv'
import { logger } from './logging.ts'
import { checkUserAndRestoreState } from './middlewares/checkUserAndRestoreState.ts'
import { machineStateHandler } from './routes/machineState.ts'
import { machineSendHandler } from './routes/machineSend.ts'
import { runCommandHandler } from './routes/runCommand.ts'
import fs from 'fs'
import path from 'path'
import { WebSocketServer } from 'ws'
import http from 'http'

dotenv.config()
logger.info('Server started and logger initialized.')

const app = express()
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

// Create an HTTP server
const server = http.createServer(app)

// Create a WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established')

  ws.on('message', (message) => {
    console.log(`Received: ${message}`)
    // Broadcast the message to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString())
      }
    })
  })

  ws.on('close', () => {
    console.log('WebSocket connection closed')
  })
})

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called')
  res.send('Hello, World!')
})

app.use(checkUserAndRestoreState)

app.get('/machineState', machineStateHandler)
app.post('/machineSend', machineSendHandler)
app.post('/run-command', runCommandHandler)

// New endpoint to handle file uploads
app.post('/files', async (req, res) => {
  logger.info('POST /files endpoint called')
  const { openaiFileIdRefs } = req.body

  if (!Array.isArray(openaiFileIdRefs)) {
    logger.error('Invalid request: openaiFileIdRefs is not an array')
    return res.status(400).json({
      error: 'Files are required and must be an array',
      advice:
        'Ensure you are sending an array of file references in the "openaiFileIdRefs" field.',
    })
  }

  if (openaiFileIdRefs.length === 0) {
    logger.error('Invalid request: openaiFileIdRefs array is empty')
    return res.status(400).json({
      error: 'The openaiFileIdRefs array is empty',
      advice:
        'Make sure to create the files in your Python environment first, then include them in the openaiFileIdRefs array when calling this endpoint.',
    })
  }

  const processedFiles = []
  const errors = []

  for (const file of openaiFileIdRefs) {
    const { name, download_link, mime_type } = file
    const filePath = path.join('/usr/src/project', name)

    logger.info(`Processing file: ${name}`)
    logger.debug(
      `File details: mime_type: ${mime_type}, path: ${filePath}`,
    )

    try {
      const response = await fetch(download_link)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const fileContent = await response.text()

      // Ensure the directory exists
      const dirPath = path.dirname(filePath)
      if (!fs.existsSync(dirPath)) {
        logger.info(`Creating directory: ${dirPath}`)
        fs.mkdirSync(dirPath, { recursive: true })
      }

      fs.writeFileSync(filePath, fileContent)
      logger.info(`File ${name} written successfully to ${filePath}`)
      logger.info(
        `File content: ${fileContent.substring(fileContent.length - 101, fileContent.length - 1)}...`,
      ) // Log first 100 characters of file content
      processedFiles.push(name)

      // Check if the file exists after writing
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        logger.info(
          `File ${name} exists after writing. Size: ${stats.size} bytes`,
        )
      } else {
        logger.error(
          `File ${name} does not exist after attempting to write it`,
        )
      }

      // List contents of the directory
      const dirContents = fs.readdirSync(dirPath)
      logger.info(
        `Contents of directory ${dirPath}: ${dirContents.join(', ')}`,
      )
    } catch (error) {
      logger.error(`Error processing file ${name}: ${error.message}`)
      errors.push({ name, error: error.message })
    }
  }

  if (errors.length > 0) {
    logger.warn('Some files could not be processed')
    res.status(207).json({
      message: 'Some files were processed, but errors occurred',
      processedFiles,
      errors,
      advice:
        'Check the errors and ensure all file references are correct. You may need to recreate and reupload the failed files.',
    })
  } else {
    logger.info('All files processed successfully')
    res.json({
      message: 'All files processed successfully',
      processedFiles,
      advice:
        'Files have been uploaded successfully. You can now use these files in your Python environment or reference them in other API calls.',
    })
  }
})

// New endpoint to send back files
app.get('/files', (req, res) => {
  logger.info('GET /files endpoint called')
  const { filepath } = req.query

  if (!filepath) {
    logger.error('Invalid request: filepath is missing')
    return res.status(400).json({
      error: 'Filepath is required',
      advice:
        'Provide the filepath as a query parameter, e.g., /files?filepath=path/to/your/file.py',
    })
  }

  const fullPath = path.join('/usr/src/project', filepath)
  logger.info(`Attempting to read file: ${fullPath}`)

  if (!fs.existsSync(fullPath)) {
    logger.error(`File not found: ${fullPath}`)
    return res.status(404).json({
      error: 'File not found',
      advice:
        "Check if the file exists and ensure you're using the correct relative path from the /usr/src/project directory.",
    })
  }

  try {
    const fileContent = fs.readFileSync(fullPath, 'utf8')
    logger.info(`File ${fullPath} read successfully`)
    logger.debug(`File content: ${fileContent.substring(0, 100)}...`) // Log first 100 characters of file content
    res.json({
      openaiFileResponse: [
        {
          name: path.basename(fullPath),
          mime_type: 'text/plain',
          content: Buffer.from(fileContent).toString('base64'),
        },
      ],
      advice:
        'You have successfully retrieved the file. You can now use this content in your Python environment or for further processing.',
    })
  } catch (error) {
    logger.error(`Error reading file ${fullPath}: ${error.message}`)
    res.status(500).json({
      error: 'Error reading file',
      details: error.message,
      advice:
        'There was an error reading the file. Check if the file is accessible and not corrupted.',
    })
  }
})

const port = 3000
server.listen(port, () => {
  logger.info(`HTTP Server is running on port ${port}`)
  logger.info(`WebSocket Server is running on ws://localhost:${port}`)
})
