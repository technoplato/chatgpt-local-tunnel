const fs = require('fs');
const path = require('path');

// List of files and directories to ignore
const ignoreList = [
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
  'ios/Pods/*',
  'CONTRIBUTING.md',
  'README.md',
  'android/build',
  'android/.gradle',
  'android/local.properties',
  'android/.idea',
  'artifacts',
  'docs',
  'storybook-static',
  'jest.config.js',
  'jest.setup.js',
  'junit.xml',
  'lib/GN_SDK-Change_Log.md',
  'patches',
  'preloaded-data',
  'snapshots',
  'secrets',
  'test-coverage-badge.svg',
  'ios/Pods/*',
  'ios/build/*',
  '*.imageset',
  'lib/*',
  'android/app/build',
  'android/build',
  '*/Contents.json',
  'contentful/*',

    // Media files
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.webp',
  '*.bmp',
  '*.ico',
  '*.mp4',
  '*.mov',
  '*.avi',
  '*.mkv',
  '*.mp3',
  '*.wav',
  '*.ogg',
  '*.flac',
  '*.ttf',
  '*.otf',
  '*.woff',
  '*.woff2'
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
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`Error reading directory: ${dir}`, err);
    return { fileList, fileTree };
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch (err) {
      console.error(`Error stating file: ${filePath}`, err);
      return;
    }

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
  allFileContents += fileTree + '\nContents of each file:\n';

  const MAX_CONTENT_LENGTH = 10000; // Limit the length of file content to avoid large strings
  // fileList.forEach((file) => {
  //   let content;
  //   try {
  //     content = fs.readFileSync(file, 'utf8');
  //     if (content.length > MAX_CONTENT_LENGTH) {
  //       content = content.substring(0, MAX_CONTENT_LENGTH) + '\n... (content truncated)\n';
  //     }
  //   } catch (err) {
  //     console.error(`Error reading file: ${file}`, err);
  //     content = 'Error reading file';
  //   }
  //   allFileContents += `### ${file} ###\n\n`;
  //   allFileContents += content + '\n\n';
  // });

  return { allFileContents:'WIP IGNORE', fileTree, fileList: 'WIP IGNORE' };
}

module.exports = { createDirectoryContentsString };
