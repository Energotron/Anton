#!/usr/bin/env bash
set -euo pipefail

VIDEO_ID='qcmwEXSbQ_U'
URL="https://www.youtube.com/watch?v=${VIDEO_ID}"
TARGET="${1:-game/webgl/music/menu-anthem.ogg}"
WORK='/tmp/kr3-anthem-full'
mkdir -p "$WORK" "$(dirname "$TARGET")"
rm -f "$WORK"/* "$TARGET"

verify_audio() {
  test -s "$TARGET" || return 1
  local duration
  duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$TARGET" 2>/dev/null || true)"
  awk -v d="$duration" 'BEGIN { exit !(d >= 245.0 && d <= 265.0) }' || return 1
  ffmpeg -v error -i "$TARGET" -f null - >/dev/null 2>&1 || return 1
  printf 'Verified anthem duration: %s s\n' "$duration"
}

convert_source() {
  local source="$1"
  test -s "$source" || return 1
  ffmpeg -y -v error -i "$source" -vn -c:a libopus -b:a 48k "$TARGET" || return 1
  verify_audio
}

# First try yt-dlp with several YouTube clients.
for client in android_vr web_embedded web_safari 'android_vr,web_embedded' 'web_embedded,web_safari'; do
  rm -f "$WORK"/source.* "$TARGET"
  if yt-dlp --no-playlist --js-runtimes node --remote-components ejs:github \
      --extractor-args "youtube:player_client=${client}" \
      -f 'bestaudio/best' -o "$WORK/source.%(ext)s" "$URL"; then
    source="$(find "$WORK" -maxdepth 1 -type f -name 'source.*' | head -n 1)"
    if test -n "$source" && convert_source "$source"; then
      exit 0
    fi
  fi
done

# Then try public Piped instances as a fallback.
for api in \
  'https://pipedapi.adminforge.de' \
  'https://pipedapi.owo.si' \
  'https://api.piped.private.coffee' \
  'https://pipedapi.nosebs.ru' \
  'https://piped-api.privacy.com.de' \
  'https://pipedapi.leptons.xyz'; do
  rm -f "$WORK/streams.json" "$WORK/piped-source" "$TARGET"
  if ! curl -fsSL --retry 2 --connect-timeout 10 --max-time 35 \
      "$api/streams/$VIDEO_ID" -o "$WORK/streams.json"; then
    continue
  fi
  stream_url="$(jq -r '[.audioStreams[]? | select(.url != null)] | sort_by(.bitrate // 0) | last | .url // empty' "$WORK/streams.json" 2>/dev/null || true)"
  test -n "$stream_url" || continue
  if curl -fL --retry 2 --connect-timeout 10 --max-time 180 \
      "$stream_url" -o "$WORK/piped-source" && convert_source "$WORK/piped-source"; then
    exit 0
  fi
done

echo 'Unable to fetch and verify the full KR3 menu anthem.' >&2
exit 1
