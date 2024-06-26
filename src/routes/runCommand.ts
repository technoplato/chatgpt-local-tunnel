import type { Request, Response } from 'express'
import { exec } from 'child_process'
import { logger } from '../logging.ts'
import * as fs from 'fs'
import { envParsedWithTypes } from '../../ENV/env.config.ts'

export const runCommandHandler = (req: Request, res: Response) => {
  const { command, commitMessage, isMutative } = req.body
  logger.info('Received /run-command request', {
    command,
    commitMessage,
    isMutative,
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
      if (stderr) {
        logger.error('Command execution error', {
          stderr,
          stdout,
          err,
        })
      }

      logger.info('Command execution complete', {
        stdout,
        stderr,
      })

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

          if (isMutative) {
            res.json({
              message: 'Command executed and git diff returned',
              output: stdout,
              err: stderr,
              diffStdout,
              diffStderr,
              diffErr,
            })
          } else {
            res.json({
              message: 'Command executed',
              output: stdout,
              error: stderr,
              err: err,
            })
          }
        },
      )
    },
  )
}
