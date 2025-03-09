const { Queue } = require('async-await-queue')
const { exec } = require('child_process')
const cronParser = require('cron-parser')
const slackNotification = require('./slackNotification')
const discordNotification = require('./discordNotification')

async function main() {
  const { containers, cronExpression, cyclePeriod } = getEnvironmentVariables()
  if (!containers.length || !cronExpression) {
    console.error('Missing required environment variables: RESTART_CONTAINERS, CRON_SCHEDULE')
    process.exit(1)
  }
  if (getArguments().SEND_ONLY_NEXT_SCHEDULED_EXECUTION_TIME_NOTIFICATION) {
  await sendNextExecutionNotification(containers, cronExpression)
    return
  }
  const cycleLimiter = new Queue(1, cyclePeriod)
  await restartContainersAndNotify(containers, cycleLimiter)
}

function getEnvironmentVariables() {
  const containers = process.env.RESTART_CONTAINERS ? process.env.RESTART_CONTAINERS.split(',') : []
  const cronExpression = process.env.CRON_SCHEDULE
  const cyclePeriod = process.env.CYCLE_PERIOD || 10000

  return { containers, cronExpression, cyclePeriod }
}

function getArguments() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key] = value || true
  })
  return args
}

async function restartContainersAndNotify(containers, cycleLimiter) {
  for (const container of containers) {
    const startTime = new Date()
    await cycleLimiter.wait(container, 0)
    await restartContainer(container)
      .then(output => sendRestartNotification(container, true, getRestartExecutionTime(startTime), output))
      .catch(error => sendRestartNotification(container, false, getRestartExecutionTime(startTime), error.message))
      .finally(() => cycleLimiter.end(container))
  }
}

function getRestartExecutionTime(startTime) {
  return new Date() - startTime
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

async function sendRestartNotification(containerName, success, executionTime, output) {
  await discordNotification.sendRestartNotification(containerName, success, executionTime, output)
  await slackNotification.sendRestartNotification(containerName, success, executionTime, output)
}

async function sendNextExecutionNotification(containers, cronExpression) {
  const nextExecutionDate = getNextExecutionDate(cronExpression)
  await discordNotification.sendNextExecutionNotification(containers, nextExecutionDate)
  await slackNotification.sendNextExecutionNotification(containers, nextExecutionDate)
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

main()
  .then(() => console.log('Done'))
  .catch(ex => console.log(ex.message))

module.exports = { main }
