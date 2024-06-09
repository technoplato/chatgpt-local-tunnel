import type { Request, Response } from 'express'
import { createActor } from 'xstate'
import { gptCoordinatorMachine } from '../src/gptCoordinator/gptCoordinatorMachine'
import {
  getPersistentSnapshot,
  savePersistentSnapshot,
} from '../utils/snapshotUtils'
import { logger } from '../logging'
import { getActorPayload } from '../utils/actorUtils.ts'

export const machineStateHandler = (req: Request, res: Response) => {
  const userId = req.headers['openai-ephemeral-user-id'] as string
  if (!userId) {
    logger.warn('No user ID provided in request headers')
    return res.status(400).json({ error: 'User ID is required' })
  }

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

  logger.info('Fetched machine meta', { meta: payload.hintsForGpt })
  logger.info('Fetched machine state', {
    state: payload.state,
    context: payload.context,
  })

  const persistedState = actor.getPersistedSnapshot()
  savePersistentSnapshot(userId, persistedState)

  res.send(payload)
}
