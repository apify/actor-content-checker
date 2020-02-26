# Actor - content checker
This actor monitors a page's content and sends a notification when content changes.

Technically it extracts text by given selector and compares it with the previous run. If there is any change, it runs another actor to send an email notification. It also saves and sends screenshots.

[Here](https://blog.apify.com/how-to-set-up-a-content-change-watchdog-for-any-website-in-5-minutes-460843b12271) is a blog post about this actor with a step-by-step tutorial how to set it up.

## INPUT

Actor needs an URL, content selector and email address. Screenshot selector can also be defined, otherwise content selector is used for screenshot.

| Field | Type | Description | Example | Mandatory
| ----- | ---- | ----------- | ------- | ---------
| url | String | URL to check | https://www.kickstarter.com/projects/solgaarddesign/carry-on-closet-solgaard-suitcase-shelf-and-usb | yes
| contentSelector | String | Monitored area selector | .mb2-lg .flex | yes
| screenshotSelector | String | Screenshot selector | .col-full.block-lg .flex | no
| sendNotificationTo | String | Email address | info@apify.com | yes

## OUTPUT

Once the actor finishes, it will update a content and screenshot in a named Key-Value store associated with the actor / task.

If the content changed, another actor is called to send an email notification.

Here's an example of an email notification with previous data, current data and 2 screenshots:

<img src="https://apify-uploads-prod.s3.amazonaws.com/XMuiubsWzSFbcQEhs-Screen_Shot_2019-01-02_at_23.23.51.png" style="max-width: 100%" />
