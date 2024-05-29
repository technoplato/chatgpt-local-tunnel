const fs = require('fs');
const path = require('path');

// List of files and directories to ignore
const ignoreList = [
  '.pnpm-store',
  'node_modules',
  '.git',
  'package-lock.json',
  'yarn.lock',
  '.env',
  'logs',
  '*.log',
  'coverage',
  '.cache',
  'dist',
  'tmp',
  'pids',
  '*.pid',
  '*.seed',
  '*.pid.lock',
  '*.tgz',
  '.eslintcache',
  '.next',
  '.nuxt',
  'serverless',
  'fusebox',
  '.vagrant',
  '.vscode',
  '.idea',
  '.DS_Store',
  '*.sublime-project',
  '*.sublime-workspace',
  'docker-compose.override.yml',
];

function shouldIgnore(filePath) {
  return ignoreList.some((pattern) => {
    if (pattern.includes('*')) {
      // Handle wildcard patterns
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

function listFiles(dir, fileList = [], indent = '') {
  let fileTree = '';
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory() && !shouldIgnore(filePath)) {
      fileTree += `${indent}├── ${file}\n`;
      const { fileList: subFileList, fileTree: subFileTree } = listFiles(
        filePath,
        fileList,
        `${indent}│   `,
      );
      fileList = subFileList;
      fileTree += subFileTree;
    } else if (stats.isFile() && !shouldIgnore(filePath)) {
      fileTree += `${indent}├── ${file}\n`;
      fileList.push(filePath);
    }
  });
  return { fileList, fileTree };
}

function createDirectoryContentsString(directory) {
  let allFileContents = 'Directory structure:\n';
  const { fileList, fileTree } = listFiles(directory);
  allFileContents += '\nContents of each file:\n';
  fileList.forEach((file) => {
    allFileContents += `### ${file} ###\n\n`;
    const content = fs.readFileSync(file, 'utf8');
    allFileContents += content + '\n\n';
  });
  return { allFileContents, fileTree };
}

module.exports = { createDirectoryContentsString };
