# Stage 1: Build the Node.js application
FROM node:alpine as builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY /app/package*.json /app/

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . /app

# Stage 2: Setup the final image
FROM alpine:latest

# Install Docker CLI
RUN apk add --no-cache docker-cli
# Copy the built Node.js application from the builder stage
COPY --from=builder /app /app
# Set working directory
WORKDIR /app

# Set default cron schedule (60 days)
ENV CRON_SCHEDULE="0 0 */60 * *"
# Environment variable to control immediate execution
ENV RUN_ON_STARTUP="false"

# Setup cron job
RUN echo "$CRON_SCHEDULE cd /app && node app.js" > /etc/crontabs/root

COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
CMD ["node", "/app/index.js"]

