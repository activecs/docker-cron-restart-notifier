const { DiscordNotification } = require('@penseapp/discord-notification')
const { Queue } = require('async-await-queue')
const { exec } = require('child_process')
const cronParser = require('cron-parser')

async function main() {
  const { containers, discordWebhookUrl, cronExpression, cyclePeriod } = getEnvironmentVariables()
  if (!isValidWebhookURL(discordWebhookUrl)) {
    console.error('Invalid Discord webhook URL, it should be in the format: https://discord.com/api/webhooks/1234567890/abc123')
  }
  if (!containers.length || !cronExpression) {
    console.error('Missing required environment variables: RESTART_CONTAINERS, CRON_SCHEDULE')
    process.exit(1)
  }
  if (getArguments().SEND_NEXT_EXECUTION_NOTIFICATION) {
    await sendStartupNotification(discordWebhookUrl, cronExpression)
  } else {
    const cycleLimiter = new Queue(1, cyclePeriod)
    await restartContainersAndNotify(containers, discordWebhookUrl, cycleLimiter)
  }
}

function getEnvironmentVariables() {
  const containers = process.env.RESTART_CONTAINERS ? process.env.RESTART_CONTAINERS.split(',') : []
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL
  const cronExpression = process.env.CRON_SCHEDULE
  const cyclePeriod = process.env.CYCLE_PERIOD || 10000

  return { containers, discordWebhookUrl, cronExpression, cyclePeriod }
}

function getArguments() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key] = value || true
  })
  return args
}

function isValidWebhookURL(url) {
  const discordWebhookURLPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/\w+$/;
  return discordWebhookURLPattern.test(url);
}

async function restartContainersAndNotify(containers, discordWebhookUrl, cycleLimiter) {
  for (const container of containers) {
    const startTime = new Date()
    await cycleLimiter.wait(container, 0)
    await restartContainer(container)
      .then(output => sendDiscordNotification(container, discordWebhookUrl, true, startTime, output))
      .catch(error => sendDiscordNotification(container, discordWebhookUrl, false, startTime, error.message))
      .finally(() => cycleLimiter.end(container))
  }
}

async function restartContainer(containerName) {
  return new Promise((resolve, reject) => {
    exec(`docker restart ${containerName} && sleep 2 && docker ps | grep ${containerName}`, (error, stdout, stderr) => {
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
    console.log(`Discord notification sent for ${containerName}, output: ${output}`)
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
    .then(() => console.log("Done"))
    .catch((ex) => console.log(ex.message));

module.exports = { main }
