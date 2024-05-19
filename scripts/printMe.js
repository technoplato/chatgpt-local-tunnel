const { createDirectoryContentsString } = require('./outputRepoContents');

const all = createDirectoryContentsString('.');

// Use dynamic import to load clipboardy and write to clipboard
(async () => {
  try {
    const clipboardy = await import('clipboardy');
    clipboardy.default.writeSync(JSON.stringify(all));
    console.log('Directory contents copied to clipboard.');
  } catch (error) {
    console.error('Error copying to clipboard:', error);
  }
})();
