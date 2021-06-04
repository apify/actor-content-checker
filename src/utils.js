const Apify = require('apify');
const { log } = Apify.utils;


// 1.
async function sendMailOnError(sendNotificationTo, url, fullPageScreenshot, errorMessage) {
    log.info('Sending mail with the info about Error on the page...');
    await Apify.call('apify/send-mail', {
        to: sendNotificationTo,
        subject: 'Apify content checker - Error!',
        text: `URL: ${url}\n ${errorMessage}`,
        attachments: [
            {
                filename: 'fullpageScreenshot.png',
                data: fullPageScreenshot.toString('base64'),
            },
        ],

    });
}

// 2.
async function screenshotDOMElement(page, selector, padding = 0) {
    const rect = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
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

// 3.
function validateInput(input) {
    // check inputs
    if (!input || !input.url || !input.contentSelector || !input.sendNotificationTo) {
        throw new Error('Invalid input, must be a JSON object with the '
            + '"url", "contentSelector", "screenshotSelector" and "sendNotificationTo" field!');
    }
}

module.exports = { screenshotDOMElement, sendMailOnError, validateInput };
