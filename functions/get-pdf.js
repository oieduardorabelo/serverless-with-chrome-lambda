const chromium = require("chrome-aws-lambda");
const fs = require("fs");
const mustache = require("mustache");

const template = fs.readFileSync("./static/template.html", { encoding: 'utf8' });

function getDataFromDatabase() {
  return {
    title: "Hello, World!",
    email: "it@works.com",
  };
}

async function handler(event, context) {
  console.log("handler.input", event, context);

  let browser = null;

  async function closeChromium() {
    if (browser !== null) {
      await browser.close();
    }
  }

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    const view = await getDataFromDatabase();
    const html = mustache.render(template, view);

    page.setContent(html);

    const pdf = await page.pdf({ format: "A4" });

    await closeChromium();

    const response = {
      statusCode: 200,
      body: pdf.toString("base64"),
      headers: {
        "Content-Type": "application/pdf",
      },
      isBase64Encoded: true,
    };

    console.log("handler.response", response);
    return response;
  } catch (error) {
    await closeChromium();

    const response = {
      statusCode: 500,
      headers: {
        "Content-Type": "text/html",
      },
      body: "Ooops, something wrong!",
    };

    console.log("handler.error", error, response);
    return response;
  }
}

module.exports = { handler };
