#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/yidian}"
REPO_URL="${REPO_URL:-https://github.com/pikachewww/daily-flow.git}"
BRANCH="${BRANCH:-main}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root."
  exit 1
fi

mkdir -p "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR/deploy/tencent"

if [ ! -f .env.production ]; then
  cp .env.production.example .env.production
  echo "Created deploy/tencent/.env.production. Edit it before running deploy again."
  exit 1
fi

docker compose up -d --build
docker compose ps

echo "Deploy complete."
