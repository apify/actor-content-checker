const Apify = require('apify');

const { log } = Apify.utils;

const distilCaptcha = async (page) => {
    return page.evaluate(() => {
        return $('#distilCaptchaForm').length > 0 || $('[action*="distil_r_captcha.html"]').length > 0;
    });
};

const accessDenied = async (page) => {
    return page.evaluate(() => {
        return $('title').text().includes('Access Denied');
    });
};

const recaptcha = async (page) => {
    const { blocked, isCaptchaDisabled } = await page.evaluate(() => {
        const backGroundCaptchaEl = $('iframe[src*="/recaptcha/"]');
        const isCaptchaDisabled = backGroundCaptchaEl.attr('style')
            && backGroundCaptchaEl.attr('style').includes('display: none');
        const isCaptchaActive = backGroundCaptchaEl.length > 0 && !isCaptchaDisabled;
        return {
            blocked: $('#recaptcha').length > 0 || isCaptchaActive,
            isCaptchaDisabled,
        };
    });

    if (isCaptchaDisabled) {
        log.warning(`Captcha is on the page but it is not activated`);
    }

    return blocked;
};

module.exports.testForBlocks = async (page) => {
    if (await accessDenied(page)) {
        throw '[BLOCKED]: Got access denied';
    }
    if (await distilCaptcha(page)) {
        throw '[BLOCKED]: Found Distil Captcha';
    }
    if (await recaptcha(page)) {
        throw '[BLOCKED]: Found Google ReCaptcha';
    }
};
