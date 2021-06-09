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

    return page.screenshot({
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

module.exports.createSlackMessage = ({ url, previousData, content, store }) => {
    return {
        text: '',
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:loudspeaker: Apify content checker :loudspeaker:\n Page ${url} changed!`,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Previous data:* ${previousData}\n\n*Current data:* ${content}`,
                },
            },
            {
                type: 'image',
                title: {
                    type: 'plain_text',
                    text: 'image1',
                    emoji: true,
                },
                image_url: `https://api.apify.com/v2/key-value-stores/${store.storeId}/records/currentScreenshot.png`,
                alt_text: 'image1',
            },
            {
                type: 'divider',
            },
            {
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: ':question: The message was generated using Apify app. You can unsubscribe these messages from the channel with "/apify list subscribe" command.',
                    },
                ],
            },
        ],
    };
};
