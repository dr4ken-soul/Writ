#!/usr/bin/env bash
#
# Compiles the Writ Compact contracts.
#
# The Compact compiler publishes linux and macOS binaries but no Windows one,
# so on Windows this script is meant to be run from inside WSL. It points at the
# extracted compiler and compiles both contracts.
#
#   wsl -e bash scripts/compact-build.sh
#
# Adjust COMPACT_BIN if you have the compiler somewhere else.

set -euo pipefail

COMPACT_BIN="${COMPACT_BIN:-/tmp/compact-x86_64-unknown-linux-musl}"

if [[ ! -x "$COMPACT_BIN/compact" ]]; then
  echo "compact compiler not found at $COMPACT_BIN/compact" >&2
  echo "Set COMPACT_BIN to the directory holding the compact binary." >&2
  exit 1
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE/.."

echo "compiler: $("$COMPACT_BIN/compact" --version)"

echo "compiling WritRegistry.compact"
"$COMPACT_BIN/compact" compile src/WritRegistry.compact ./src/managed/writ-registry

echo "compiling AuditLog.compact"
"$COMPACT_BIN/compact" compile src/AuditLog.compact ./src/managed/audit-log

echo "done"