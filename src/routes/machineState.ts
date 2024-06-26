import type { Request, Response } from 'express'
import { createActor } from 'xstate'
import { savePersistentSnapshot } from '../utils/snapshotUtils.ts'
import { logger } from '../logging.ts'
import { getActorPayload } from '../utils/actorUtils.ts'
import { coordinatorMachine } from '../gptCoordinator/coordinator.machine.ts'

export const machineStateHandler = (req: Request, res: Response) => {
  const userId = req.userId as string
  const restoredState = req.restoredState

  logger.info('Received /machineState request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
  })

  const actor = createActor(coordinatorMachine, {
    input: {
      containerProjectLocation:
        process.env.USER_PROJECT_CONTAINER_LOCATION,
    },
    ...(restoredState && { snapshot: restoredState }),
  }).start()

  logger.info(
    `Machine state before sending command:\n${JSON.stringify(actor.getSnapshot())}`,
  )
  logger.info(
    `Machine state after /machineState:\n${JSON.stringify(actor.getSnapshot())}`,
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
