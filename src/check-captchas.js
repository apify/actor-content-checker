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
    return page.evaluate(() => {
        return $('#recaptcha').length > 0 || $('iframe[src*="/recaptcha/"]').length > 0;
    });
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
