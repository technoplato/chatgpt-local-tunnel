import express from 'express';
import {
  __unsafe_getAllOwnEventDescriptors,
  type AnyActor,
  createActor,
} from 'xstate';
import { gptCoordinatorMachine } from './src/gptCoordinator/gptCoordinatorMachine.ts';
import * as fs from 'fs';
import { exec } from 'child_process';
import winston from 'winston';

// Setup Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

const app = express();
app.use(express.json());

const port = 3000;

const externalProjectPath = '/usr/src/project';

const actor = createActor(gptCoordinatorMachine);
actor.start();

app.get('/machineState', (req, res) => {
  const state = actor.getSnapshot().value;
  const nextEvents = __unsafe_getAllOwnEventDescriptors(actor.getSnapshot());
  const context = actor.getSnapshot().context;

  logger.info('Fetched machine state', { state, context });

  res.send({
    state,
    context,
    nextEvents,
  });
});

app.post('/machineSend', (req, res) => {
  const command = req.body.command;
  if (!command) {
    logger.warn('No command provided in /machineSend request');
    return res.status(400).json({ error: 'Command is required' });
  }

  logger.info('Received command for machineSend', { command });
  actor.send({ type: command });
  const snapshot = actor.getSnapshot();
  const nextEvents = __unsafe_getAllOwnEventDescriptors(snapshot);

  const meta = snapshot.getMeta();
  const hintsForGpt = meta.hintsForGpt;
  logger.info('Processed command for machineSend', { state: snapshot.value });

  res.send({
    state: snapshot.value,
    context: snapshot.context,
    hints: hintsForGpt,
    nextEvents,
  });
});

app.post('/run-command', async (req, res) => {
  const { command, commitMessage } = req.body;
  logger.info('Received /run-command request', { command, commitMessage });

  if (!command || !commitMessage) {
    logger.error('Command and commit message are required');
    return res.status(400).json({ error: 'Command and commit message are required' });
  }

  if (!fs.existsSync(externalProjectPath)) {
    logger.error('External project path does not exist', { path: externalProjectPath });
    return res.status(400).json({ error: 'External project path does not exist' });
  }

  exec(command, { cwd: externalProjectPath }, (err, stdout, stderr) => {
    if (err) {
      logger.error('Command execution error', { stderr });
      return res.status(500).json({ error: stderr });
    }

    logger.info('Command executed and changes committed successfully', { stdout });
    res.json({
      message: 'Command executed and changes committed successfully',
      output: stdout,
    });
  });
});

app.get('/', (req, res) => {
  logger.info('Hello, World! endpoint was called');
  res.send('Hello, World!');
});

app.listen(port, () => {
  logger.info();
});
