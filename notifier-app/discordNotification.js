const { DiscordNotification } = require('@penseapp/discord-notification')

function getEnvironmentVariables() {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  return { discordWebhookUrl }
}

function validateWebhookUrl() {
  const { discordWebhookUrl } = getEnvironmentVariables()
  const discordWebhookURLPattern = /^https:\/\/discord\.com\/api\/webhooks\/.+/
  return discordWebhookURLPattern.test(discordWebhookUrl)
}

async function sendRestartNotification(containerName, success, executionTime, output) {
  if (!validateWebhookUrl()) {
    return
  }
  const { discordWebhookUrl } = getEnvironmentVariables()
  const discordNotification = new DiscordNotification('restart-notifier', discordWebhookUrl)
  const message = success ? discordNotification.sucessfulMessage() : discordNotification.errorMessage()
  const formattedOutput = output ? `> ${output.replace(/\n/g, '\n> ')}` : 'No output available';
  
  try {
    await message
      .addTitle('Cron Restart Container')
      .addDescription(`The scheduled restart task for Docker container has been executed.`)
      .addField({ name: 'Container', value: formatContainers([containerName]), inline: false })
      .addField({ name: 'Status', value: success ? '✅ Successfully restarted' : '❌ Failed to restart', inline: false })
      .addField({ name: 'Time', value: toDiscordTimestamp(new Date()), inline: false })
      .addField({ name: 'Output', value: formattedOutput, inline: false })
      .addFooter(`Total execution time: ${executionTime} ms`)
      .sendMessage()
    console.log(`Discord notification sent for ${containerName}, output: ${output}`)
  } catch (error) {
    console.error(`Error sending Discord notification for ${containerName}`, error)
    if (error.response) {
      console.error('Discord API Response:', error.response)
    }
  }
}

async function sendNextExecutionNotification(containers, nextExecutionDate) {
  if (!validateWebhookUrl()) {
    console.warn(
      'Invalid Discord webhook URL, it should be in the format: https://discord.com/api/webhooks/1234567890/abc123'
    )
    return
  }
  const { discordWebhookUrl } = getEnvironmentVariables()
  if (!nextExecutionDate) {
    console.log('Unable to determine the next execution date.')
    return
  }
  const discordNotification = new DiscordNotification('restart-notifier', discordWebhookUrl)
  try {
    await discordNotification
      .sucessfulMessage()
      .addTitle('Container Restart Scheduled')
      .addDescription(`The next container restart is scheduled.`)
      .addField({ name: 'Containers', value: formatContainers(containers), inline: false })
      .addField({ name: 'Scheduled Time', value: toDiscordTimestamp(nextExecutionDate), inline: false })
      .addFooter('Container Restart Scheduler')
      .sendMessage()
    console.log('Startup discord notification sent.')
  } catch (error) {
    console.error(`Error discord sending startup notification`, error)
    if (error.response) {
      console.error('Discord API Response:', error.response)
    }
  }
}

function formatContainers(containers) {
  return containers.map(container => `• ${container}`).join('\n');
}

function toDiscordTimestamp(date) {
  return `<t:${toUnixTimestamp(date)}:F>`
}

function toUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000)
}

module.exports = { validateWebhookUrl, sendRestartNotification, sendNextExecutionNotification }
