// returns screenshot of a given element
module.exports = async (page, selector, padding = 0) => {
    const rect = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        const { x, y, width, height } = element.getBoundingClientRect();
        return { left: x, top: y, width, height, id: element.id };
    }, selector);

    return page.screenshot({
        fullpage: true,
        clip: {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
        },
    });
}
