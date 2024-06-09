import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://chatgpt.com/g/g-hkRwNB7i7-local-machine-assistant');

  // Extract some basic information
  const title = await page.title();
  const content = await page.content();

  console.log('Title:', title);
  console.log('Content length:', content.length);

  await browser.close();
})();
