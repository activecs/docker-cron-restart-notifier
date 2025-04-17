#!/bin/bash

# Alpine comes with built in cron schedules
# min   hour    day     month   weekday command
# */15    *       *       *       *       run-parts /etc/periodic/15min
# 0       *       *       *       *       run-parts /etc/periodic/hourly
# 0       2       *       *       *       run-parts /etc/periodic/daily
# 0       3       *       *       6       run-parts /etc/periodic/weekly
# 0       5       1       *       *       run-parts /etc/periodic/monthly

# Setup cron job
touch crontab.tmp \
  && echo "$CRON_SCHEDULE cd /app && node index.js >> /var/log/restart-notifier/cron.log 2>&1 " > crontab.tmp \
  && crontab crontab.tmp \
  && rm -rf crontab.tmp

# Check if DISCORD_WEBHOOK_URL is provided
if [ -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "Warning: DISCORD_WEBHOOK_URL environment variable is empty." >&2
fi

# Check if DISCORD_WEBHOOK_URL is provided
if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "Warning: SLACK_WEBHOOK_URL environment variable is empty." >&2
fi

if [ "$RUN_ON_STARTUP" = "true" ]; then
  echo "Running on startup"
  node /app/index.js
else
  echo "Next scheduled execution time: $CRON_SCHEDULE"
  node /app/index.js SEND_ONLY_NEXT_SCHEDULED_EXECUTION_TIME_NOTIFICATION
fi




# Start the cron daemon in the foreground
# crond --help
# BusyBox v1.28.4 (2018-05-30 10:45:57 UTC) multi-call binary.
# Usage: crond -fbS -l N -d N -L LOGFILE -c DIR
#        -f      Foreground
#        -b      Background (default)
#        -S      Log to syslog (default)
#        -l N    Set log level. Most verbose 0, default 8
#        -d N    Set log level, log to stderr
#        -L FILE Log to FILE
#        -c DIR  Cron dir. Default:/var/spool/cron/crontabs
echo "Starting cron daemon in the foreground: $CRON_SCHEDULE"
exec crond -f -d 8
