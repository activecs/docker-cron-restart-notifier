const { Queue } = require('async-await-queue')
const { CronExpressionParser } = require('cron-parser')
const slackNotification = require('./slackNotification')
const discordNotification = require('./discordNotification')
const Docker = require('dockerode')
const os = require('os')

async function main() {
  const { containers, cronExpression, cyclePeriod, dockerHost } = getEnvironmentVariables()
  if (!containers.length || !cronExpression) {
    console.error('Missing required environment variables: RESTART_CONTAINERS, CRON_SCHEDULE')
    process.exit(1)
  }
  let docker
  try {
    docker = createDockerClient(dockerHost)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (getArguments().SEND_ONLY_NEXT_SCHEDULED_EXECUTION_TIME_NOTIFICATION) {
    await sendNextExecutionNotification(containers, cronExpression, docker)
    return
  }
  const cycleLimiter = new Queue(1, cyclePeriod)
  await restartContainersAndNotify(containers, cycleLimiter, docker)
}

function getEnvironmentVariables() {
  const containers = process.env.RESTART_CONTAINERS ? process.env.RESTART_CONTAINERS.split(',') : []
  const cronExpression = process.env.CRON_SCHEDULE
  const cyclePeriod = process.env.CYCLE_PERIOD || 10000
  const dockerHost = process.env.DOCKER_HOST
  return { containers, cronExpression, cyclePeriod, dockerHost }
}

function getHostIdentifier() {
  return process.env.IDENTIFIER || os.hostname()
}

function getArguments() {
  const args = {}
  process.argv.slice(2).forEach(arg => {
    const [key, value] = arg.split('=')
    args[key] = value || true
  })
  return args
}

const DEFAULT_DOCKER_SOCKET = '/var/run/docker.sock'

/**
 * Builds the Docker client from DOCKER_HOST, or from the default socket when DOCKER_HOST is not set.
 * Options are always passed explicitly, so dockerode never falls back to its own environment lookup.
 * @param {string} [dockerHost] - unix:///path/to/docker.sock, tcp://host:port, http://host:port or https://host:port
 * @returns {Docker} Docker client instance
 * @throws {Error} If DOCKER_HOST is not a supported URL
 */
function createDockerClient(dockerHost) {
  if (!dockerHost) {
    console.log(`Docker API: unix://${DEFAULT_DOCKER_SOCKET} (DOCKER_HOST not set)`)
    return new Docker({ socketPath: DEFAULT_DOCKER_SOCKET })
  }
  const options = parseDockerHost(dockerHost)
  console.log(`Docker API: ${dockerHost} (DOCKER_HOST)`)
  return new Docker(options)
}

function parseDockerHost(dockerHost) {
  const unsupported = new Error(
    `Unsupported DOCKER_HOST "${dockerHost}": use unix:///path/to/docker.sock, tcp://host:port, http://host:port or https://host:port`
  )
  let url
  try {
    url = new URL(dockerHost)
  } catch {
    throw unsupported
  }
  switch (url.protocol) {
    case 'unix:':
      return { socketPath: url.pathname }
    case 'tcp:':
    case 'http:':
      return { protocol: 'http', host: url.hostname, port: url.port || 2375 }
    case 'https:':
      return { protocol: 'https', host: url.hostname, port: url.port || 2376 }
    default:
      throw unsupported
  }
}

function describeDockerError(containerName, error) {
  if (error.statusCode === 404) {
    return `Container ${containerName} not found`
  }
  if (error.statusCode === 403) {
    return `Docker API denied access to ${containerName} (403); a socket proxy needs CONTAINERS=1 and POST=1`
  }
  return `Docker API request for ${containerName} failed: ${error.message || error.code}`
}

async function restartContainersAndNotify(containers, cycleLimiter, docker) {
  for (const container of containers) {
    const startTime = new Date()
    await cycleLimiter.wait(container, 0)
    await restartContainer(docker, container)
      .then(output => sendRestartNotification(container, true, getRestartExecutionTime(startTime), output))
      .catch(error => {
        console.error(error.message)
        return sendRestartNotification(container, false, getRestartExecutionTime(startTime), error.message)
      })
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
    throw new Error(describeDockerError(containerName, error))
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
    throw new Error(describeDockerError(containerName, error))
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
      if (error.statusCode !== 404) {
        console.error(describeDockerError(containerName, error))
      }
      statuses.push({ name: containerName, exists: false })
    }
  }
  return statuses
}

async function sendRestartNotification(containerName, success, executionTime, output) {
  const hostIdentifier = getHostIdentifier()
  await discordNotification.sendRestartNotification(containerName, success, executionTime, output, hostIdentifier)
  await slackNotification.sendRestartNotification(containerName, success, executionTime, output, hostIdentifier)
}

async function sendNextExecutionNotification(containers, cronExpression, docker) {
  const nextExecutionDate = getNextExecutionDate(cronExpression)

  // Check container existence
  const containerStatuses = await checkContainerExistence(docker, containers)
  const hostIdentifier = getHostIdentifier()

  await discordNotification.sendNextExecutionNotification(containerStatuses, nextExecutionDate, hostIdentifier)
  await slackNotification.sendNextExecutionNotification(containerStatuses, nextExecutionDate, hostIdentifier)
}

function getNextExecutionDate(cronExpression) {
  try {
    const interval = CronExpressionParser.parse(cronExpression)
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
