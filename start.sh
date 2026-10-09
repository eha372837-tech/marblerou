#!/usr/bin/env sh
set -eu
PORT="${PORT:-4173}"
exec python3 -m http.server "$PORT" --bind 0.0.0.0
