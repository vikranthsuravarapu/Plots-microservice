#!/bin/sh
# Wait until frontend is reachable
until wget --spider --quiet http://frontend:80; do
  echo "Waiting for frontend..."
  sleep 2
done

# Start nginx
nginx -g "daemon off;"