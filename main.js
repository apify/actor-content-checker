const Apify = require('apify');
const JsDiff = require('diff');

// returns screenshot of a given element
async function screenshotDOMElement(page, selector, padding = 0) {
    const rect = await page.evaluate(selector => {
        const element = document.querySelector(selector);
        const {x, y, width, height} = element.getBoundingClientRect();
        return {left: x, top: y, width, height, id: element.id};
    }, selector);

    return await page.screenshot({
        clip: {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2   
        }
    });
}

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');
    const store = await Apify.openKeyValueStore('content-checker-store');
    
    if (!input || !input.url || !input.contentSelector || !input.screenshotSelector || !input.sendNotificationTo) 
    throw new Error('Invalid input, must be a JSON object with the ' + 
        '"url", "contentSelector", "screenshotSelector" and "sendNotificationTo" field!');
    
    const previousScreenshot = await store.getValue('currentScreenshot.png');
    const previousData = await store.getValue('currentData');
    
    console.log('Launching Puppeteer...');
    const browser = await Apify.launchPuppeteer();
    
    console.log(`Opening URL: ${input.url}`);  
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.goto(input.url, {waitUntil: 'networkidle2'});

    console.log(`Sleeping 5s ...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    // Store a screenshot
    console.log('Saving screenshot...');
    const screenshotBuffer = await screenshotDOMElement(page, input.screenshotSelector, 16);
    await store.setValue('currentScreenshot.png', screenshotBuffer, { contentType: 'image/png' });
    
    // Store data
    const content = await page.$eval(input.contentSelector, el => el.textContent);
    
    console.log('Previous data: ' + previousData);
    console.log('Current data: ' + content);
    await store.setValue('currentData', content);
    
    console.log('Closing Puppeteer...');
    await browser.close();
    
    console.log('Done.');
    
    if (previousScreenshot === null) {
        console.log('Running for the first time, no check');
    } else {
        
        await store.setValue('previousScreenshot.png', previousScreenshot, { contentType: 'image/png' });
        await store.setValue('previousData', previousData); 
    
        // check data
        if (previousData === content) {
            console.log('No change');    
        } else {
            console.log('Content changed');
            const diff = JsDiff.diffWords(previousData, content)
            console.log(diff);
            
            //send mail
            console.log('Sending mail...');
            await Apify.call('apify/send-mail', {
                to: input.sendNotificationTo,
                subject: 'Apify content checker - page changed!',
                text: `Page content for ${input.url} has changed
                    previous data: ${previousData}
                    current data: ${content}
                    diff: ${JSON.stringify(diff, null, 2)}`,
                
                attachments: [
                    {
                        filename: 'previousScreenshot.png',
                        data: previousScreenshot.toString('base64')
                    },
                    {
                        filename: 'currentScreenshot.png',
                        data: screenshotBuffer.toString('base64')
                    }
                ]
                
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
