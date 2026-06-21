const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting browser...");
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.stack || err.toString()));
  page.on('requestfailed', request => {
    console.log('BROWSER REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  console.log("Navigating to http://localhost:3002/dashboard ...");
  try {
    await page.goto('http://localhost:3002/dashboard', { waitUntil: 'networkidle2', timeout: 15000 });
  } catch(e) {
    console.log("Navigation timeout or error:", e);
  }

  // Check the HTML
  const content = await page.content();
  console.log("PAGE CONTENT LENGTH:", content.length);
  if (content.includes("AUTHENTICATING")) {
    console.log("Found AUTHENTICATING string in DOM");
  }

  await browser.close();
  console.log("Done");
})();
