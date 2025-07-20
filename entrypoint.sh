#!/bin/bash

set -e

if [ -n "$CLIENT_PEM_BASE64" ]; then
  echo "$CLIENT_PEM_BASE64" | base64 -d > /etc/ssl/client.pem
  chmod 600 /etc/ssl/client.pem
fi

exec dotnet UserReportingApi.dll
