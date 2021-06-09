const Apify = require('apify');

const { screenshotDOMElement, sendMailOnError, validateInput, createSlackMessage } = require('./utils');
const { testForBlocks } = require('./check-captchas');

const { log, sleep } = Apify.utils;

Apify.main(async () => {
    const input = await Apify.getInput();
    validateInput(input);

    const {
        url,
        contentSelector,
        sendNotificationTo,
        // if screenshotSelector is not defined, use contentSelector for screenshot
        screenshotSelector = contentSelector,
        sendNotificationText,
        proxy = {
            useApifyProxy: false,
        },
        navigationTimeout = 30000,
        informOnError,
        maxRetries = 5,
        retryStrategy = 'on-block', // 'on-block', 'on-all-errors', 'never-retry'
    } = input;

    // define name for a key-value store based on task ID or actor ID
    // (to be able to have more content checkers under one Apify account)
    let storeName = 'content-checker-store-';
    storeName += !process.env.APIFY_ACTOR_TASK_ID ? process.env.APIFY_ACT_ID : process.env.APIFY_ACTOR_TASK_ID;

    // use or create a named key-value store
    const store = await Apify.openKeyValueStore(storeName);

    // get data from previous run
    const previousScreenshot = await store.getValue('currentScreenshot.png');
    const previousData = await store.getValue('currentData');

    // Residentials would be useful but we don't want everyone to bother us with those
    const proxyConfiguration = await Apify.createProxyConfiguration(proxy);

    const requestQueue = await Apify.openRequestQueue();
    await requestQueue.addRequest({ url });

    // We gather these in the crawler and then process them later
    let screenshotBuffer;
    let fullPageScreenshot;
    let content;

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        proxyConfiguration,
        maxRequestRetries: retryStrategy === 'never-retry' ? 0 : maxRetries,
        launchContext: {
            launchOptions: {
                defaultViewport: { width: 1920, height: 1080 },
            },
        },
        preNavigationHooks: [async (crawlingContext, gotoOptions) => {
            gotoOptions.waitUntil = 'networkidle2';
            gotoOptions.timeout = navigationTimeout;
        }],
        handlePageFunction: async ({ page, response }) => {
            if (response.status() === 404 && response.status()) {
                log.warning(`404 Status - Page not found! Please change the URL`);
                return;
            }
            if (response.status() >= 400) {
                throw `Response status: ${response.status()}. Probably got blocked, trying again!`;
            }
            log.info(`Page loaded with title: ${await page.title()} on URL: ${url}`);
            // wait 5 seconds (if there is some dynamic content)
            // TODO: this should wait for the selector to be available
            log.info('Sleeping 5s ...');
            await sleep(5000);

            try {
                await Apify.utils.puppeteer.injectJQuery(page);
            } catch (e) {
                // TODO: Rewrite selectors to non-JQuery
                log.warning('Could not inject JQuery so cannot test captcha presence');
            }

            await testForBlocks(page);

            log.info('Saving screenshot...');

            let errorHappened = false;
            let errorMessage;

            try {
                content = await page.$eval(contentSelector, (el) => el.textContent);
            } catch (e) {
                errorHappened = true;
                errorMessage = `Failed to extract the content, either the content `
                    + `selector is wrong or page layout changed. Check the full screenshot.`;
            }

            if (!errorHappened) {
                try {
                    screenshotBuffer = await screenshotDOMElement(page, screenshotSelector, 10);
                } catch (e) {
                    errorHappened = true;
                    errorMessage = `Failed to capture the screenshot, either the screenshot or `
                        + `content selector is wrong or page layout changed. Check the full screenshot.`;
                }
            }

            if (errorHappened) {
                fullPageScreenshot = await page.screenshot({ fullPage: true }); 
                if (retryStrategy === 'on-all-errors') {
                    const updatedMessage = `${errorMessage} Will retry...`;
                    throw updatedMessage;
                } else {
                    log.warning(errorMessage);
                }
            }
        },
    });

    await crawler.run();

    // All retries to get screenshot failed
    if (!screenshotBuffer) {
        await store.setValue('fullpageScreenshot.png', fullPageScreenshot, { contentType: 'image/png' });
        // SENDING EMAIL WITH THE INFO ABOUT ERROR AND FULL PAGE SCREENSHOT
        const errorMessage = `Cannot get screenshot (screenshot selector is probably wrong).`
            + `\nMade screenshot of the full page instead: `
            + `\nhttps://api.apify.com/v2/key-value-stores/${store.id}/records/fullpageScreenshot.png`;
        if (informOnError === 'true') {
            await sendMailOnError(sendNotificationTo, url, fullPageScreenshot, errorMessage);
        }

        // We use simple string throw deliberately so users are not bothered with stack traces
        throw errorMessage;
    }

    // We got the screenshot
    await store.setValue('currentScreenshot.png', screenshotBuffer, { contentType: 'image/png' });

    // Store data
    if (!content) {
        const errorMessage = `Cannot get content (content selector is probably wrong).`
            + `\nMade screenshot of the full page instead:\nhttps://api.apify.com/v2/key-value-stores/${store.id}/records/fullpageScreenshot.png`;
        // MAKING AND SAVING FULL PAGE SCREENSHOT
        await store.setValue('fullpageScreenshot.png', fullPageScreenshot, { contentType: 'image/png' });
        // SENDING EMAIL WITH THE INFO ABOUT ERROR AND FULL PAGE SCREENSHOT
        if (informOnError === 'true') {
            await sendMailOnError(sendNotificationTo, url, fullPageScreenshot, errorMessage);
        }
        throw errorMessage;
    }

    log.info(`Previous data: ${previousData}`);
    log.info(`Current data: ${content}`);
    await store.setValue('currentData', content);

    log.info('Done.');

    if (previousScreenshot === null) {
        log.warning('Running for the first time, no check');
    } else {
        // store data from this run
        await store.setValue('previousScreenshot.png', previousScreenshot, { contentType: 'image/png' });
        await store.setValue('previousData', previousData);

        // check data
        if (previousData === content) {
            log.warning('No change');
        } else {
            log.warning('Content changed');

            const notificationNote = sendNotificationText ? `Note: ${sendNotificationText}\n\n` : '';

            // create slack message used by Apify slack integration
            const message = createSlackMessage({ url, previousData, content, store });
            await Apify.setValue('SLACK_MESSAGE', message);

            // send mail
            log.info('Sending mail...');
            await Apify.call('apify/send-mail', {
                to: sendNotificationTo,
                subject: 'Apify content checker - page changed!',
                text: `URL: ${url}\n\n${notificationNote}Previous data: ${previousData}\n\nCurrent data: ${content}`,
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
    log.info('You can check the output in the named key-value store on the following URLs:');
    log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/currentScreenshot.png`);
    log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/currentData`);

    if (previousScreenshot !== null) {
        log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/previousScreenshot.png`);
        log.info(`- https://api.apify.com/v2/key-value-stores/${store.id}/records/previousData`);
    }
});
