import type { Request, Response, NextFunction } from 'express'
import { getPersistentSnapshot } from '../utils/snapshotUtils'
import { logger } from '../logging'

export const checkUserAndRestoreState = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.headers['openai-ephemeral-user-id'] as string
  if (!userId) {
    logger.warn('No user ID provided in request headers')
    return res.status(400).json({ error: 'User ID is required' })
  }

  const restoredState = getPersistentSnapshot(userId)
  if (!restoredState) {
    logger.warn(`No restored state found for user ID: ${userId}`)
  }

  req.userId = userId
  req.restoredState = restoredState
  next()
}
