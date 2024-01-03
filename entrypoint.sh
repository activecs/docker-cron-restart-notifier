#!/bin/bash

# Setup cron job
touch crontab.tmp \
  && echo "$CRON_SCHEDULE cd /app && node index.js >> /cron.log 2>&1 " > crontab.tmp \
  && crontab crontab.tmp \
  && rm -rf crontab.tmp

# Check if DISCORD_WEBHOOK_URL is provided
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "Error: DISCORD_WEBHOOK_URL environment variable is required." >&2
    exit 1
fi

if [ "$RUN_ON_STARTUP" = "true" ]; then
  echo "Sending startup notification"
  node /app/index.js SEND_NEXT_EXECUTION_NOTIFICATION
fi

# Start the cron daemon in the foreground
echo "Starting cron "
exec crond -f -d 8