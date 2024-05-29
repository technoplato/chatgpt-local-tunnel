const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
// const { runCLI } = require('jest');
// async function runTests(projectPath) {
//   const options = {
//     runInBand: true,
//     testPathPattern: projectPath,
//   };
//
//   const { results } = await runCLI(options, [projectPath]);
//   logger.info('Tests run successfully', { projectPath });
//   return results;
// }

const simpleGit = require('simple-git');
const { exec } = require('child_process');
const winston = require('winston');

require('dotenv').config();

const {
  createDirectoryContentsString,
} = require('./scripts/outputRepoContents.js');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'server.log' }),
    new winston.transports.Console(),
  ],
});

const app = express();
app.use(bodyParser.json());

const externalProjectPath = '/usr/src/project';

let selectedFiles = [];

// Endpoint to select files
app.post('/select-files', (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files)) {
    logger.error('Files should be an array');
    return res.status(400).json({ error: 'Files should be an array' });
  }
  selectedFiles = files;
  logger.info('Files selected successfully', { selectedFiles });
  res.json({ message: 'Files selected successfully', selectedFiles });
});

// Endpoint to get the contents of selected files
app.get('/selected-files', (req, res) => {
  if (selectedFiles.length === 0) {
    logger.error('No files selected');
    return res.status(400).json({ error: 'No files selected' });
  }

  let allFileContents = 'Contents of selected files:\n\n';
  selectedFiles.forEach((filePath) => {
    const fullFilePath = path.join(externalProjectPath, filePath);
    if (fs.existsSync(fullFilePath)) {
      const content = fs.readFileSync(fullFilePath, 'utf8');
      allFileContents += `### ${filePath} ###\n\n`;
      allFileContents += content + '\n\n';
    } else {
      allFileContents += `### ${filePath} ###\n\nFile not found\n\n`;
    }
  });

  logger.info('Selected files contents retrieved');
  res.json({ allFileContents });
});

app.post('/run-command', async (req, res) => {
  const { command, commitMessage } = req.body;
  logger.info('-------------------------------------------------------------');
  logger.info(`Command: ${command}`);
  logger.info(`Commit message: ${commitMessage}`);
  logger.info('-------------------------------------------------------------');
  if (!command || !commitMessage) {
    logger.error('Command and commit message are required');
    return res.status(400).json({ error: 'Command and commit message are required' });
  }

  // Check if the directory exists
  if (!fs.existsSync(externalProjectPath)) {
    logger.error(`Directory ${externalProjectPath} does not exist`);
    return res.status(400).json({ error: `Directory ${externalProjectPath} does not exist` });
  }

  exec(command, { cwd: externalProjectPath }, async (err, stdout, stderr) => {
    if (err) {
      logger.error('Command execution error', { stderr });
      return res.status(500).json({ error: stderr });
    }

    const git = simpleGit(externalProjectPath);

    try {
      // Add and commit the changes
      await git.add('.');
      await git.commit(commitMessage);

      logger.info('Command executed and changes committed successfully', { stdout });
      res.json({
        message: 'Command executed and changes committed successfully',
        output: stdout,
      });
    } catch (error) {
      logger.error('Git commit error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/file', (req, res) => {
  const filePath = path.join(externalProjectPath, req.query.filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      logger.error('File read error', { error: err.message });
      return res.status(500).json({ error: err.message });
    }
    logger.info('File content retrieved', { filePath });
    res.json({ content: data });
  });
});

app.post('/file', async (req, res) => {
  const { filePath, content } = req.body;
  const fullFilePath = path.join(externalProjectPath, filePath);

  // Check if the directory exists
  const dir = path.dirname(fullFilePath);
  if (!fs.existsSync(dir)) {
    logger.error(`Directory ${dir} does not exist`);
    return res.status(400).json({ error: `Directory ${dir} does not exist` });
  }

  fs.writeFile(fullFilePath, content, 'utf8', async (err) => {
    if (err) {
      logger.error('File write error', { error: err.message });
      return res.status(500).json({ error: err.message });
    }

    try {
      const testResults = await runTests(fullFilePath);
      logger.info('File written and tests run successfully', { filePath });
      res.json({ results: testResults });
    } catch (error) {
      logger.error('Test run error', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/all-files', (req, res) => {
  const directory = req.query.directory || externalProjectPath;
  if (!fs.existsSync(directory)) {
    logger.error(`Directory ${directory} does not exist`);
    return res
      .status(400)
      .json({ error: `Directory ${directory} does not exist` });
  }

  const files = createDirectoryContentsString(directory);
  logger.info('All files retrieved', { directory });
  res.json({ files });
});

app.get('/all-tests', async (req, res) => {
  try {
    const testResults = await runTests(externalProjectPath);
    logger.info('All tests run successfully');
    res.json({ results: testResults });
  } catch (error) {
    logger.error('Test run error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

function logDirectoryTree(dir, depth = 0) {
  if (depth > 2) return; // Limit the depth to avoid too much output
  const prefix = ' '.repeat(depth * 2);
  logger.info(`${prefix}${dir}`);
  const items = fs.readdirSync(dir);
  items.forEach((item) => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      logDirectoryTree(itemPath, depth + 1);
    } else {
      logger.info(`${prefix}  ${item}`);
    }
  });
}

function getGitConfig(projectPath) {
  const gitConfigPath = path.join(projectPath, '.git/config');
  if (fs.existsSync(gitConfigPath)) {
    const config = fs.readFileSync(gitConfigPath, 'utf8');
    const userMatch = config.match(
      /\[user\]\s*name\s*=\s*(.+)\s*email\s*=\s*(.+)/,
    );
    if (userMatch) {
      return {
        name: userMatch[1].trim(),
        email: userMatch[2].trim(),
      };
    }
  }
  return null;
}

app.post('/propose-changes', async (req, res) => {
  const { commitMessage, files } = req.body;
  const resolvedProjectPath = path.resolve(externalProjectPath);
  const git = simpleGit(resolvedProjectPath);

  try {
    // Ensure the project directory exists
    if (!fs.existsSync(resolvedProjectPath)) {
      logger.error(`Project path ${resolvedProjectPath} does not exist`);
      logger.info('Current directory tree:');
      logDirectoryTree(path.resolve(resolvedProjectPath, '..')); // Log the parent directory tree
      return res.status(400).json({ error: `Project path ${resolvedProjectPath} does not exist` });
    }

    // Write each file
    files.forEach((file) => {
      const fullPath = path.join(resolvedProjectPath, file.filePath);
      const dir = path.dirname(fullPath);

      // Ensure the directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(fullPath, file.content, 'utf8');
    });

    // Add and commit the changes
    await git.add('.');
    await git.commit(commitMessage);

    // Run tests
    const testResults = await runTests(resolvedProjectPath);
    logger.info('Changes proposed and tests run successfully', { commitMessage });
    res.json({ results: testResults });
  } catch (error) {
    logger.error('Propose changes error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

async function runTests(projectPath) {
  return new Promise((resolve, reject) => {
    exec('npm test', { cwd: path.resolve(projectPath) }, (error, stdout, stderr) => {
      if (error) {
        logger.error('Error running tests', { error, stderr });
        return reject(stderr);
      }
      logger.info('Tests run successfully', { stdout });
      resolve(stdout);
    });
  });
}

const port = 3000;
app.listen(port, () => {
  const { allFileContents, fileTree } =
    createDirectoryContentsString(externalProjectPath);

  logger.info(allFileContents);
  logger.info(fileTree);

  logger.info(`Server running on port ${port}`);
});
