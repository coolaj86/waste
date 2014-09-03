#!/bin/bash
set -e
set -u

NAME=$1
mkdir -p migrations
touch "migrations/`date -u '+%F_%H-%M-%S'`_${NAME}.json"
echo "migrations/`date -u '+%F_%H-%M-%S'`_${NAME}.json"
