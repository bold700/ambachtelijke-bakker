#!/usr/bin/env bash
# Encode raw videos to scrubbing-friendly mp4s.
#
# Usage:
#   bin/encode.sh raw/*.mp4         # encodes everything in raw/ to media/
#   bin/encode.sh raw/01.mov        # single file
#
# Output: 960px wide, all-keyframes, audio stripped, ~3-6MB per 8s clip.

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <input-files...>" >&2
  echo "Example: $0 raw/*.mp4" >&2
  exit 1
fi

mkdir -p media

for input in "$@"; do
  if [ ! -f "$input" ]; then
    echo "  skip: $input (not a file)" >&2
    continue
  fi
  name="$(basename "$input" | sed 's/\.[^.]*$//')"
  output="media/${name}.mp4"
  echo "→ $input → $output"
  ffmpeg -y -i "$input" \
    -vf "scale=960:-2" \
    -c:v libx264 -preset slow -crf 24 \
    -g 1 -keyint_min 1 -sc_threshold 0 \
    -an -movflags +faststart \
    "$output" 2>&1 | tail -1
done

echo "Done. $(ls media/*.mp4 2>/dev/null | wc -l | tr -d ' ') files in media/"
du -sh media/ 2>/dev/null || true
