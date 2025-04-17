const { IncomingWebhook } = require('@slack/webhook')

function getEnvironmentVariables() {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL
  return { slackWebhookUrl }
}

function validateWebhookUrl() {
  const { slackWebhookUrl } = getEnvironmentVariables()
  const slackWebhookURLPattern = /^https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[a-zA-Z0-9]+$/
  return slackWebhookURLPattern.test(slackWebhookUrl)
}

async function sendRestartNotification(containerName, success, executionTime, output) {
  if (!validateWebhookUrl()) {
    return
  }
  const { slackWebhookUrl } = getEnvironmentVariables()
  const webhook = new IncomingWebhook(slackWebhookUrl)

  const statusEmoji = success ? '✅' : '❌'
  const statusText = success ? 'Successfully restarted' : 'Failed to restart'
  const formattedOutput = output ? `\`\`\`${output}\`\`\`` : 'No output available'

  try {
    await webhook.send({
      text: 'Cron Restart Container',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Cron Restart Container',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'The scheduled restart task for Docker container has been executed.'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Container*\n• ${containerName}`
            },
            {
              type: 'mrkdwn',
              text: `*Status*\n${statusEmoji} ${statusText}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Time*\n<!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|${new Date().toLocaleString()}>`
            },
            {
              type: 'mrkdwn',
              text: `*Execution Time*\n${executionTime} ms`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Output*\n${formattedOutput}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Total execution time: ${executionTime} ms`
            }
          ]
        }
      ]
    })
    console.log(`Slack notification sent for ${containerName}, output: ${output}`)
  } catch (error) {
    console.error(`Error sending Slack notification for ${containerName}: ${error}`)
  }
}

async function sendNextExecutionNotification(containers, nextExecutionDate) {
  if (!validateWebhookUrl()) {
    console.warn(
      'Invalid Slack webhook URL, it should be in the format: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX'
    )
    return
  }
  const { slackWebhookUrl } = getEnvironmentVariables()
  if (!nextExecutionDate) {
    console.warn('Unable to determine the next execution date.')
    return
  }
  const webhook = new IncomingWebhook(slackWebhookUrl)

  try {
    await webhook.send({
      text: 'Container Restart Scheduled',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Container Restart Scheduled',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'The next container restart is scheduled.'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Containers*\n${formatContainers(containers)}`
            },
            {
              type: 'mrkdwn',
              text: `*Scheduled Time*\n<!date^${Math.floor(nextExecutionDate.getTime() / 1000)}^{date_short_pretty} at {time}|${nextExecutionDate.toLocaleString()}>`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'Container Restart Scheduler'
            }
          ]
        }
      ]
    })
    console.log('Startup slack notification sent.')
  } catch (error) {
    console.error(`Error slack sending startup notification: ${error}`)
  }
}

function formatContainers(containers) {
  return containers.map(container => `• ${container}`).join('\n')
}

module.exports = { validateWebhookUrl, sendRestartNotification, sendNextExecutionNotification }
