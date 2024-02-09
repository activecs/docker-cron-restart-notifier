const { IncomingWebhook } = require('@slack/webhook');

function getEnvironmentVariables() {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    return { slackWebhookUrl };
}

function validateWebhookUrl() {
    const { slackWebhookUrl } = getEnvironmentVariables();
    const slackWebhookURLPattern = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+$/;
    return slackWebhookURLPattern.test(slackWebhookUrl)
}

async function sendRestartNotification(containerName, success, executionTime, output) {
    if (!validateWebhookUrl()) {
        return
    }
    const { slackWebhookUrl } = getEnvironmentVariables();
    const webhook = new IncomingWebhook(slackWebhookUrl);

    const title = 'Cron Restart Container';
    const status = success ? 'Successfully restarted' : 'Failed to restart';
    const text = `The scheduled restart task for Docker container *${containerName}* has been executed.\n*Status:* ${status}\n*Output:* ${output}\n*Total execution time:* ${executionTime} ms`;

    try {
        await webhook.send({
            text: title,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: text
                    }
                }
            ]
        });
        console.log(`Slack notification sent for ${containerName}, output: ${output}`);
    } catch (error) {
        console.error(`Error sending Slack notification for ${containerName}: ${error}`);
    }
}

async function sendNextExecutionNotification(containers, nextExecutionDate) {
    if (!validateWebhookUrl()) {
        console.warn('Invalid Slack webhook URL, it should be in the format: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX')
        return
    }
    const { slackWebhookUrl } = getEnvironmentVariables();
    if (!nextExecutionDate) {
        console.log('Unable to determine the next execution date.');
        return;
    }
    const webhook = new IncomingWebhook(slackWebhookUrl);
    const title = 'Container Restart Scheduled';
    const text = `The next scheduled (${containers}) container restart is set for ${nextExecutionDate.toLocaleString()}.`;

    try {
        await webhook.send({
            text: title,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: text
                    }
                }
            ]
        });
        console.log('Startup slack notification sent.');
    } catch (error) {
        console.error(`Error slack sending startup notification: ${error}`);
    }
}

module.exports = { validateWebhookUrl, sendRestartNotification, sendNextExecutionNotification };
