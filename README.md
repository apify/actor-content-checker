# Content Checker

<!-- toc start -->
- [Features](#features)
- [Tutorial](#tutorial)
- [Input](#input)
- [Output](#output)
<!-- toc end -->

## Features

This actor lets you monitor specific content on any web page and sends an email notification with before and after screenshots whenever that content changes. You can use this to create your own watchdog for prices, product updates, sales, competitors, or to track changes in any content that you want to keep an eye on.

Technically, it extracts text by selector and compares it with the previous run. If there is any change, it runs another actor to send an email notification, save, and send screenshots.

## Tutorial
Read this (https://blog.apify.com/how-to-set-up-a-content-change-watchdog-for-any-website-in-5-minutes-460843b12271) blog post for more ideas and a step-by-step tutorial on how to set it up.

## Input

The actor needs a URL, content selector, and an email address. A screenshot selector can also be defined or, if not defined, the content selector is used for the screenshot.

| Field | Type | Description | Example | Mandatory
| ----- | ---- | ----------- | ------- | ---------
| url | String | URL to check | https://www.kickstarter.com/projects/solgaarddesign/carry-on-closet-solgaard-suitcase-shelf-and-usb | yes
| contentSelector | String | Monitored area selector | .mb2-lg .flex | yes
| screenshotSelector | String | Screenshot selector | .col-full.block-lg .flex | no
| sendNotificationTo | String | Email address | info@apify.com | yes
| sendNotificationText | String | Notification Text | Follow instructions in company wiki for updating the database | no
| proxy | Object | Proxy Configuration | `{ "useApifyProxy": true }` | no
| navigationTimeout | Number | Navigation Timeout in milliseconds | 30000 | no

## Output

Once the actor finishes, it will update content and screenshot in a named key-value store associated with the actor/task.

If the content changed, another actor is called to send an email notification.

Here's an example of an email notification with previous data, changed data, and two screenshots:
<img src="https://apify-uploads-prod.s3.amazonaws.com/XMuiubsWzSFbcQEhs-Screen_Shot_2019-01-02_at_23.23.51.png" style="max-width: 100%" />


