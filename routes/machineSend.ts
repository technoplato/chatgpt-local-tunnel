import { Request, Response } from 'express';
import { createActor } from 'xstate';
import { gptCoordinatorMachine } from '../src/gptCoordinator/gptCoordinatorMachine';
import { getPersistentSnapshot, savePersistentSnapshot } from '../utils/snapshotUtils';
import { getActorPayload } from '../utils/actorUtils';
import { logger } from '../logging';

export const machineSendHandler = (req: Request, res: Response) => {
  const userId = req.headers['openai-ephemeral-user-id'] as string;
  if (!userId) {
    logger.warn('No user ID provided in request headers');
    return res.status(400).json({ error: 'User ID is required' });
  }

  const command = req.body.command;
  if (!command) {
    logger.warn('No command provided in /machineSend request');
    return res.status(400).json({ error: 'Command is required' });
  }
  logger.info('Received command for machineSend', { command });

  const restoredState = getPersistentSnapshot(userId);
  const actor = createActor(gptCoordinatorMachine, {
    input: {
      containerProjectLocation: process.env.USER_PROJECT_CONTAINER_LOCATION,
    },
    ...(restoredState && { snapshot: restoredState }),
  }).start();

  logger.info(`Machine state before sending command: ${JSON.stringify(actor.getSnapshot())}`);
  logger.info(`Machine state after /machineState: ${JSON.stringify(actor.getSnapshot())}`);

  actor.send({ type: command });
  logger.info(`Machine state after sending command: ${JSON.stringify(actor.getSnapshot())}`);
  logger.info('Sent command for machineSend', { command });

  const payload = getActorPayload(actor);
  logger.info('Processed command for machineSend', {
    state: payload.state,
  });

  logger.info('Fetched machine meta', { meta: payload.hintsForGpt });

  const persistedState = actor.getPersistedSnapshot();
  savePersistentSnapshot(userId, persistedState);

  res.send(payload);
};
