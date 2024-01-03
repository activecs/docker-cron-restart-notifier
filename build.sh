docker build -t deduard/tools:restart-notifier-$(date +%Y%m%d) . --rm
docker push deduard/tools:restart-notifier-$(date +%Y%m%d)