const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { runCLI } = require('jest');
const simpleGit = require('simple-git');
const { exec } = require('child_process');

require('dotenv').config();

const {
  createDirectoryContentsString,
} = require('./scripts/outputRepoContents.js');

const app = express();
app.use(bodyParser.json());

const externalProjectPath = '/usr/src/project/src';


let selectedFiles = [];

// Endpoint to select files
app.post('/select-files', (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'Files should be an array' });
  }
  selectedFiles = files;
  res.json({ message: 'Files selected successfully', selectedFiles });
});

// Endpoint to get the contents of selected files
app.get('/selected-files', (req, res) => {
  if (selectedFiles.length === 0) {
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

  res.json({ allFileContents });
});

app.post('/run-command', async (req, res) => {
  const { command, commitMessage } = req.body;
  if (!command || !commitMessage) {
    return res
      .status(400)
      .json({ error: 'Command and commit message are required' });
  }

  exec(command, { cwd: externalProjectPath }, async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr });
    }

    const git = simpleGit(externalProjectPath);

    try {
      // Add and commit the changes
      await git.add('.');
      await git.commit(commitMessage);

      res.json({
        message: 'Command executed and changes committed successfully',
        output: stdout,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/file', (req, res) => {
  const filePath = path.join(externalProjectPath, req.query.filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ content: data });
  });
});

app.post('/file', async (req, res) => {
  const { filePath, content } = req.body;
  const fullFilePath = path.join(externalProjectPath, filePath);

  fs.writeFile(fullFilePath, content, 'utf8', async (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    try {
      const testResults = await runTests(fullFilePath);
      res.json({ results: testResults });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

app.get('/all-files', (req, res) => {
  const directory = req.query.directory || externalProjectPath;
  if (!fs.existsSync(directory)) {
    return res
      .status(400)
      .json({ error: `Directory ${directory} does not exist` });
  }

  const files = createDirectoryContentsString(directory);
  res.json({ files });
});

app.get('/all-tests', async (req, res) => {
  try {
    const testResults = await runTests(externalProjectPath);
    res.json({ results: testResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function logDirectoryTree(dir, depth = 0) {
  if (depth > 2) return; // Limit the depth to avoid too much output
  const prefix = ' '.repeat(depth * 2);
  console.log(`${prefix}${dir}`);
  const items = fs.readdirSync(dir);
  items.forEach((item) => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      logDirectoryTree(itemPath, depth + 1);
    } else {
      console.log(`${prefix}  ${item}`);
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
      console.log(`Project path ${resolvedProjectPath} does not exist`);
      console.log('Current directory tree:');
      logDirectoryTree(path.resolve(resolvedProjectPath, '..')); // Log the parent directory tree
      return res
        .status(400)
        .json({ error: `Project path ${resolvedProjectPath} does not exist` });
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

    // Read Git config
    const gitConfig = getGitConfig(resolvedProjectPath);
    if (!gitConfig) {
      return res
        .status(500)
        .json({ error: 'Git user configuration not found in the project' });
    }

    // Temporarily set Git user configuration
    await git.addConfig('user.name', gitConfig.name);
    await git.addConfig('user.email', gitConfig.email);

    // Add and commit the changes
    await git.add('.');
    await git.commit(commitMessage);

    // Run tests
    const testResults = await runTests(resolvedProjectPath);
    res.json({ results: testResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function runTests(projectPath) {
  const options = {
    runInBand: true,
    testPathPattern: projectPath,
  };

  const { results } = await runCLI(options, [projectPath]);
  return results;
}

const port = 3000;
app.listen(port, () => {
  // const { allFileContents, fileTree } =
  //   createDirectoryContentsString(externalProjectPath);
  //
  // console.log(allFileContents);
  // console.log(fileTree);

  console.log(`Server running on port ${port}`);
});
