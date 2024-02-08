const {DiscordNotification} = require("@penseapp/discord-notification");

function getEnvironmentVariables() {
    const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
    return { discordWebhookUrl }
}

function validateWebhookUrl() {
    const { discordWebhookUrl } = getEnvironmentVariables()
    const discordWebhookURLPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/\w+$/
    return discordWebhookURLPattern.test(discordWebhookUrl)
}

async function sendRestartNotification(containerName, success, executionTime, output) {
    const { discordWebhookUrl } = getEnvironmentVariables()
    const discordNotification = new DiscordNotification("restart-notifier", discordWebhookUrl)
    const message = success ? discordNotification.sucessfulMessage() : discordNotification.errorMessage()
    try {
        await message
            .addTitle('Cron Restart Container')
            .addDescription(`The scheduled restart task for Docker container ${containerName} has been executed.`)
            .addField({name: 'Status', value: success ? 'Successfully restarted' : 'Failed to restart', inline: false})
            .addField({name: 'Output', value: output, inline: false})
            .addFooter(`Total execution time: ${executionTime} ms`)
            .sendMessage()
        console.log(`Discord notification sent for ${containerName}, output: ${output}`)
    } catch (error) {
        console.error(`Error sending Discord notification for ${containerName}: ${error}`)
    }
}

async function sendNextExecutionNotification(nextExecutionDate) {
    const { discordWebhookUrl } = getEnvironmentVariables()
    if (!nextExecutionDate) {
        console.log('Unable to determine the next execution date.')
        return
    }
    const discordNotification = new DiscordNotification("restart-notifier", discordWebhookUrl)
    try {
        await discordNotification
            .sucessfulMessage()
            .addTitle('Container Restart Scheduled')
            .addDescription(`The next scheduled container restart is set for ${nextExecutionDate.toLocaleString()}.`)
            .addFooter('Container Restart Scheduler')
            .sendMessage()
        console.log('Startup discord notification sent.')
    } catch (error) {
        console.error(`Error discord sending startup notification: ${error}`)
    }
}

module.exports = { validateWebhookUrl, sendRestartNotification, sendNextExecutionNotification }