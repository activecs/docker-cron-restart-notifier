const { Queue } = require('async-await-queue')
const cronParser = require('cron-parser')
const slackNotification = require('./slackNotification')
const discordNotification = require('./discordNotification')
const Docker = require('dockerode')

async function main() {
  const { containers, cronExpression, cyclePeriod, dockerHost } = getEnvironmentVariables()
  if (!containers.length || !cronExpression) {
    console.error('Missing required environment variables: RESTART_CONTAINERS, CRON_SCHEDULE')
    process.exit(1)
  }
  if (getArguments().SEND_ONLY_NEXT_SCHEDULED_EXECUTION_TIME_NOTIFICATION) {
    await sendNextExecutionNotification(containers, cronExpression)
    return
  }
  const cycleLimiter = new Queue(1, cyclePeriod)
  const docker = createDockerClient(dockerHost)
  await restartContainersAndNotify(containers, cycleLimiter, docker)
}

function getEnvironmentVariables() {
  const containers = process.env.RESTART_CONTAINERS ? process.env.RESTART_CONTAINERS.split(',') : []
  const cronExpression = process.env.CRON_SCHEDULE
  const cyclePeriod = process.env.CYCLE_PERIOD || 10000
  const dockerHost = process.env.DOCKER_HOST
  return { containers, cronExpression, cyclePeriod, dockerHost }
}

function getArguments() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key] = value || true
  })
  return args
}

function createDockerClient(dockerHost) {
  if (dockerHost) {
    return new Docker({
      host: dockerHost
    })
  } else {
    // Fallback to direct socket access
    return new Docker({
      socketPath: '/var/run/docker.sock'
    })
  }
}

async function restartContainersAndNotify(containers, cycleLimiter, docker) {
  for (const container of containers) {
    const startTime = new Date()
    await cycleLimiter.wait(container, 0)
    await restartContainer(docker, container)
      .then(output => sendRestartNotification(container, true, getRestartExecutionTime(startTime), output))
      .catch(error => sendRestartNotification(container, false, getRestartExecutionTime(startTime), error.message))
      .finally(() => cycleLimiter.end(container))
  }
}

function getRestartExecutionTime(startTime) {
  return new Date() - startTime
}

/**
 * Restarts a Docker container and returns its status
 * @param {Docker} docker - Docker client instance
 * @param {string} containerName - Name of the container to restart
 * @returns {Promise<string>} Status message of the container
 * @throws {Error} If container restart fails
 */
async function restartContainer(docker, containerName) {
  const container = docker.getContainer(containerName)
  try {
    await container.inspect()
  } catch (error) {
    throw new Error(`Container ${containerName} not found: ${error.message}`)
  }
  try {
    const infoBefore = await container.inspect()
    if (
      infoBefore.State.Status === 'running' ||
      infoBefore.State.Status === 'restarting' ||
      infoBefore.State.Status === 'paused'
    ) {
      await container.stop({ t: 60 })
      console.log(`Container ${containerName} stopped successfully`)
    }
    await container.start()
    console.log(`Container ${containerName} started successfully`)
    const infoAfter = await container.inspect()
    return `Container ${containerName} restarted successfully.\nStatus before: ${infoBefore.State.Status}\nStatus after: ${infoAfter.State.Status}`
  } catch (error) {
    console.error(`Error restarting container ${containerName}:`, error.message)
    throw error
  }
}

/**
 * Checks which containers exist and returns their status
 * @param {Docker} docker - Docker client instance
 * @param {string[]} containerNames - Array of container names to check
 * @returns {Promise<Array>} Array of objects with container name and existence status
 */
async function checkContainerExistence(docker, containerNames) {
  const statuses = []

  for (const containerName of containerNames) {
    const container = docker.getContainer(containerName)
    try {
      await container.inspect()
      statuses.push({ name: containerName, exists: true })
    } catch (error) {
      statuses.push({ name: containerName, exists: false })
    }
  }
  return statuses
}

async function sendRestartNotification(containerName, success, executionTime, output) {
  await discordNotification.sendRestartNotification(containerName, success, executionTime, output)
  await slackNotification.sendRestartNotification(containerName, success, executionTime, output)
}

async function sendNextExecutionNotification(containers, cronExpression) {
  const nextExecutionDate = getNextExecutionDate(cronExpression)
  const { dockerHost } = getEnvironmentVariables()
  const docker = createDockerClient(dockerHost)

  // Check container existence
  const containerStatuses = await checkContainerExistence(docker, containers)

  await discordNotification.sendNextExecutionNotification(containerStatuses, nextExecutionDate)
  await slackNotification.sendNextExecutionNotification(containerStatuses, nextExecutionDate)
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
