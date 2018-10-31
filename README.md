# actor-content-checker
You can use this act to monitor any page's content and get a notification when content changes.

Technically it extracts text by given selector and compares it with the previous run. If there is any change, it runs another act to send an email notification. It also saves and sends a screenshot.

Here's an example of an email notification with previous data, current data, diff and 2 screenshots:

<img src="https://apify-uploads-prod.s3.amazonaws.com/a1392dec-f2eb-4d68-a422-7d35ddd66680_ScreenShot2018-10-31at11.03.54.png" style="max-width: 100%" />
