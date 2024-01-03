docker build -t deduard/tools:restart-notifier-$(date +%Y%m%d)v2 . --rm
docker push deduard/tools:restart-notifier-$(date +%Y%m%d)v2