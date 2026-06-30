#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/opt/yidian/backups}"
VOLUME_NAME="${VOLUME_NAME:-tencent_yidian_data}"

mkdir -p "$BACKUP_DIR"

docker run --rm \
  -v "${VOLUME_NAME}:/data:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine sh -c 'cp /data/checkin.sqlite "/backup/checkin-$(date +%F-%H%M%S).sqlite"'

find "$BACKUP_DIR" -name "checkin-*.sqlite" -type f -mtime +30 -delete

echo "Backup complete: $BACKUP_DIR"
