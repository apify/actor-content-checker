module.exports = (input) => {
    // check inputs
    if (!input || !input.url || !input.contentSelector || !input.sendNotificationTo) {
        throw new Error('Invalid input, must be a JSON object with the '
        + '"url", "contentSelector", "screenshotSelector" and "sendNotificationTo" field!');
    }
};
