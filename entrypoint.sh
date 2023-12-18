#!/bin/bash

# Check if DISCORD_WEBHOOK_URL is provided
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "Error: DISCORD_WEBHOOK_URL environment variable is required." >&2
    exit 1
fi

if [ "$RUN_ON_STARTUP" = "true" ]; then
  node /app/index.js SEND_NEXT_EXECUTION_NOTIFICATION
fi

# Start the cron daemon in the background
crond -f -d 8 &

exec "$@"
