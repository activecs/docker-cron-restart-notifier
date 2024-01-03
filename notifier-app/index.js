const { DiscordNotification } = require('@penseapp/discord-notification')
const { exec } = require('child_process')
const cronParser = require('cron-parser')

async function main() {
  const args = {}
  const containers = process.env.RESTART_CONTAINERS ? process.env.CONTAINERS.split(',') : []
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  const cronExpression = process.env.CRON_SCHEDULE

  if (!discordWebhookUrl || (!containers.length && !cronExpression)) {
    console.error('Missing required environment variables.')
    process.exit(1)
  }

  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key] = value || true
  })

  if (args.SEND_NEXT_EXECUTION_NOTIFICATION) {
    await sendStartupNotification(discordWebhookUrl, cronExpression)
  } else {
    await restartContainersAndNotify(containers, discordWebhookUrl)
  }
}

async function restartContainersAndNotify(containers, discordWebhookUrl) {
  for (const container of containers) {
    const startTime = new Date()
    try {
      const output = await restartContainer(container)
      await sendDiscordNotification(container, discordWebhookUrl, true, startTime, output)
    } catch (error) {
      console.error(error)
      await sendDiscordNotification(container, discordWebhookUrl, false, startTime, error.message)
    }
  }
}

async function restartContainer(containerName) {
  return new Promise((resolve, reject) => {
    exec(`docker restart ${containerName} && docker ps | grep ${containerName}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting container ${containerName}:`, stderr)
        reject(error)
      } else {
        console.log(`Container ${containerName} restarted successfully.`)
        resolve(stdout)
      }
    })
  })
}

async function sendDiscordNotification(containerName, discordWebhookUrl, success, startTime, output) {
  const executionTime = new Date() - startTime
  const discordNotification = new DiscordNotification("restart-notifier", discordWebhookUrl)
  const message = success ? discordNotification.sucessfulMessage() : discordNotification.errorMessage()
  try {
    await message
        .addTitle('Cron Restart Container')
        .addDescription(`The scheduled restart task for Docker container ${containerName} has been executed.`)
        .addField({ name: 'Status', value: success ? 'Successfully restarted' : 'Failed to restart', inline: false })
        .addField({ name: 'Output', value: output, inline: false })
        .addFooter(`Total execution time: ${executionTime} ms`)
        .sendMessage()
    console.log(`Discord notification sent for ${containerName}.`)
  } catch (error) {
    console.error(`Error sending Discord notification for ${containerName}: ${error}`)
  }
}

function getNextExecutionDate(cronExpression) {
  try {
    const interval = cronParser.parseExpression(cronExpression)
    return interval.next().toDate()
  } catch (err) {
    console.error('Error parsing cron expression:', err)
    return null
  }
}

async function sendStartupNotification(discordWebhookUrl, cronExpression) {
  const nextExecutionDate = getNextExecutionDate(cronExpression)
  if (!nextExecutionDate) {
    console.log('Unable to determine the next execution date.')
    return
  }
  const discordNotification = new DiscordNotification("restart-notifier", discordWebhookUrl)
  try {
    await discordNotification
    .sucessfulMessage()
    .addTitle('Container Restart Scheduled')
    .addDescription(`The next scheduled container restart is set for ${nextExecutionDate.toDateString()}.`)
    .addFooter('Container Restart Scheduler')
    .sendMessage()
    console.log('Startup notification sent.')
  } catch (error) {
    console.error(`Error sending startup notification: ${error}`)
  }
}

main()

module.exports = { main }
