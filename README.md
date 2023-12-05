# Docker Image for Scheduled Container Restart with Discord Notifications
## Overview
This Docker image is designed to automatically restart specified Docker containers every 60 days and send notifications to a Discord channel upon each restart. It's particularly useful for maintaining long-running services, ensuring they're periodically refreshed and stakeholders are informed of these actions.

## Features
- **Automated Container Restart: Restart specified Docker containers every 60 days.
- **Discord Notifications: Sends a message to a Discord channel after each container restart.

## Running the Container
Run the container with the following command:
docker run -d -e RESTART_CONTAINERS="container1 container2" -e DISCORD_WEBHOOK_URL="your_discord_webhook_url"

## Environment Variables
- RESTART_CONTAINERS: A space-separated list of container names to be restarted.
- DISCORD_WEBHOOK_URL: The webhook URL for sending notifications to Discord.

## Cron Schedule
The image is configured to restart the specified containers every 60 days. To modify this schedule, you can update the cron job setup in the Dockerfile.
