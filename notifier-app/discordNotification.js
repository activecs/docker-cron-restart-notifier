// Embed colors kept from the @penseapp/discord-notification variants this module used before.
const SUCCESS_COLOR = 0x00c851
const ERROR_COLOR = 0xff4444

function getEnvironmentVariables() {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  return { discordWebhookUrl }
}

function validateWebhookUrl() {
  const { discordWebhookUrl } = getEnvironmentVariables()
  const discordWebhookURLPattern = /^https:\/\/discord\.com\/api\/webhooks\/.+/
  return discordWebhookURLPattern.test(discordWebhookUrl)
}

async function sendRestartNotification(containerName, success, executionTime, output, hostIdentifier) {
  if (!validateWebhookUrl()) {
    return
  }
  const { discordWebhookUrl } = getEnvironmentVariables()
  const formattedOutput = output ? `> ${output.replace(/\n/g, '\n> ')}` : 'No output available'

  try {
    await sendEmbed(discordWebhookUrl, {
      color: success ? SUCCESS_COLOR : ERROR_COLOR,
      title: 'Cron Restart Container',
      description: 'The scheduled restart task for Docker container has been executed.',
      fields: [
        { name: 'Host', value: hostIdentifier },
        { name: 'Containers', value: formatContainers([containerName]) },
        { name: 'Status', value: success ? '✅ Successfully restarted' : '❌ Failed to restart' },
        { name: 'Time', value: toDiscordTimestamp(new Date()) },
        { name: 'Output', value: formattedOutput }
      ],
      footer: `Total execution time: ${executionTime} ms`
    })
    console.log(`Discord notification sent for ${containerName}, output: ${output}`)
  } catch (error) {
    console.error(`Error sending Discord notification for ${containerName}`, error)
  }
}

async function sendNextExecutionNotification(containerStatuses, nextExecutionDate, hostIdentifier) {
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
  try {
    await sendEmbed(discordWebhookUrl, {
      color: SUCCESS_COLOR,
      title: 'Container Restart Scheduled',
      description: 'The next container restart is scheduled.',
      fields: [
        { name: 'Host', value: hostIdentifier },
        { name: 'Containers', value: formatContainersWithStatus(containerStatuses) },
        { name: 'Scheduled Time', value: toDiscordTimestamp(nextExecutionDate) }
      ],
      footer: 'Container Restart Scheduler'
    })
    console.log('Startup discord notification sent.')
  } catch (error) {
    console.error(`Error discord sending startup notification`, error)
  }
}

async function sendEmbed(webhookUrl, { color, title, description, fields, footer }) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          author: { name: 'restart-notifier' },
          color,
          title,
          description,
          fields: fields.map(field => ({ ...field, inline: false })),
          footer: { text: footer }
        }
      ]
    }),
    signal: AbortSignal.timeout(10000)
  })
  if (!response.ok) {
    throw new Error(`Discord API responded ${response.status}: ${await response.text()}`)
  }
}

function formatContainers(containers) {
  return containers.map(container => `• ${container}`).join('\n')
}

function formatContainersWithStatus(containerStatuses) {
  return containerStatuses
    .map(status => {
      const statusIcon = status.exists ? '✅' : '❌'
      const statusText = status.exists ? '' : ' (not found)'
      return `• ${statusIcon} ${status.name}${statusText}`
    })
    .join('\n')
}

function toDiscordTimestamp(date) {
  return `<t:${toUnixTimestamp(date)}:F>`
}

function toUnixTimestamp(date) {
  return Math.floor(date.getTime() / 1000)
}

module.exports = { validateWebhookUrl, sendRestartNotification, sendNextExecutionNotification }
