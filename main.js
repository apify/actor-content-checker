const Apify = require('apify');

// returns screenshot of a given element
async function screenshotDOMElement(page, selector, padding = 0) {
    const rect = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
    }, selector);

    return await page.screenshot({
        clip: {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        },
    });
}

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');

    // define name for a key-value store based on task ID or actor ID
    // (to be able to have more content checkers under one Apify account)
    let storeName = 'content-checker-store-';
    storeName += !process.env.APIFY_ACTOR_TASK_ID ? process.env.APIFY_ACT_ID : process.env.APIFY_ACTOR_TASK_ID;

    // use or create a named key-value store
    const store = await Apify.openKeyValueStore(storeName);

    // check inputs
    if (!input || !input.url || !input.contentSelector || !input.sendNotificationTo) {
        throw new Error('Invalid input, must be a JSON object with the '
        + '"url", "contentSelector", "screenshotSelector" and "sendNotificationTo" field!');
    }

    // if screenshotSelector is not defined, use contentSelector for screenshot
    if (!input.screenshotSelector) input.screenshotSelector = input.contentSelector;

    // get data from previous run
    const previousScreenshot = await store.getValue('currentScreenshot.png');
    const previousData = await store.getValue('currentData');

    // open page in a browser
    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();

    console.log(`Opening URL: ${input.url}`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(input.url, { waitUntil: 'networkidle2' });

    // wait 5 seconds (if there is some dynamic content)
    console.log('Sleeping 5s ...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Store a screenshot
    console.log('Saving screenshot...');
    let screenshotBuffer = null;
    try {
        screenshotBuffer = await screenshotDOMElement(page, input.screenshotSelector, 10);
    } catch (e) {
        throw new Error('Cannot get screenshot (screenshot selector is probably wrong)');
    }
    await store.setValue('currentScreenshot.png', screenshotBuffer, { contentType: 'image/png' });

    // Store data
    console.log('Saving data...');
    let content = null;
    try {
        content = await page.$eval(input.contentSelector, (el) => el.textContent);
    } catch (e) {
        throw new Error('Cannot get content (content selector is probably wrong)');
    }

    console.log(`Previous data: ${previousData}`);
    console.log(`Current data: ${content}`);
    await store.setValue('currentData', content);

    console.log('Closing Puppeteer...');
    await browser.close();

    console.log('Done.');

    if (previousScreenshot === null) {
        console.log('Running for the first time, no check');
    } else {
        // store data from this run
        await store.setValue('previousScreenshot.png', previousScreenshot, { contentType: 'image/png' });
        await store.setValue('previousData', previousData);

        // check data
        if (previousData === content) {
            console.log('No change');
        } else {
            console.log('Content changed');

            // send mail
            console.log('Sending mail...');
            await Apify.call('apify/send-mail', {
                to: input.sendNotificationTo,
                subject: 'Apify content checker - page changed!',
                text: `URL: ${input.url}\n`
                    + input.sendNotificationText ? `Note: ${input.sendNotificationText}\n` : ''
                    + `Previous data: ${previousData}\n`
                    + `Current data: ${content}\n`,

                attachments: [
                    {
                        filename: 'previousScreenshot.png',
                        data: previousScreenshot.toString('base64'),
                    },
                    {
                        filename: 'currentScreenshot.png',
                        data: screenshotBuffer.toString('base64'),
                    },
                ],

            });
        }
    }

    console.log('You can check the output in the named key-value store on the following URLs:');
    console.log(`- https://api.apify.com/v2/key-value-stores/${store.storeId}/records/currentScreenshot.png`);
    console.log(`- https://api.apify.com/v2/key-value-stores/${store.storeId}/records/currentData`);

    if (previousScreenshot !== null) {
        console.log(`- https://api.apify.com/v2/key-value-stores/${store.storeId}/records/previousScreenshot.png`);
        console.log(`- https://api.apify.com/v2/key-value-stores/${store.storeId}/records/previousData`);
    }
});
