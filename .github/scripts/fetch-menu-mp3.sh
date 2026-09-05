#!/usr/bin/env bash
set -euo pipefail

VIDEO_ID='qcmwEXSbQ_U'
URL="https://www.youtube.com/watch?v=${VIDEO_ID}"
TARGET="${1:-game/webgl/music/menu-anthem.mp3}"
WORK="${RUNNER_TEMP:-/tmp}/kr3-menu-mp3"
mkdir -p "$WORK" "$(dirname "$TARGET")"
rm -f "$WORK"/* "$TARGET"

source_file=''
for client in android_vr web_embedded web_safari 'android_vr,web_embedded' 'web_embedded,web_safari'; do
  rm -f "$WORK"/source.*
  if yt-dlp --no-playlist --js-runtimes node --remote-components ejs:github \
      --extractor-args "youtube:player_client=${client}" \
      -f 'bestaudio/best' -o "$WORK/source.%(ext)s" "$URL"; then
    source_file="$(find "$WORK" -maxdepth 1 -type f -name 'source.*' | head -n 1)"
    if test -n "$source_file" && test -s "$source_file"; then
      break
    fi
  fi
done

if ! test -s "${source_file:-}"; then
  for api in \
    'https://pipedapi.adminforge.de' \
    'https://pipedapi.owo.si' \
    'https://api.piped.private.coffee' \
    'https://pipedapi.nosebs.ru' \
    'https://piped-api.privacy.com.de' \
    'https://pipedapi.leptons.xyz'; do
    rm -f "$WORK/streams.json" "$WORK/piped-source"
    if ! curl -fsSL --retry 2 --connect-timeout 10 --max-time 35 \
        "$api/streams/$VIDEO_ID" -o "$WORK/streams.json"; then
      continue
    fi
    stream_url="$(jq -r '[.audioStreams[]? | select(.url != null)] | sort_by(.bitrate // 0) | last | .url // empty' "$WORK/streams.json" 2>/dev/null || true)"
    test -n "$stream_url" || continue
    if curl -fL --retry 2 --connect-timeout 10 --max-time 180 \
        "$stream_url" -o "$WORK/piped-source"; then
      source_file="$WORK/piped-source"
      break
    fi
  done
fi

test -s "${source_file:-}" || { echo 'Unable to fetch full KR3 anthem source.' >&2; exit 1; }

ffmpeg -y -v error -i "$source_file" -map 0:a:0 -vn \
  -c:a libmp3lame -b:a 96k -ar 44100 -ac 2 -map_metadata -1 \
  -id3v2_version 3 -metadata title='За краем орбит' \
  -metadata artist='Космические Рейнджеры 2' "$TARGET"

duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$TARGET")"
codec="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "$TARGET")"
bitrate="$(ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of default=nw=1:nk=1 "$TARGET")"
test "$codec" = 'mp3'
awk -v d="$duration" 'BEGIN { exit !(d >= 245.0 && d <= 265.0) }'
awk -v b="$bitrate" 'BEGIN { exit !(b >= 90000 && b <= 100000) }'
ffmpeg -v error -i "$TARGET" -f null - >/dev/null 2>&1
printf 'Verified MP3: duration=%s sec bitrate=%s size=%s bytes\n' "$duration" "$bitrate" "$(stat -c%s "$TARGET")"
sha256sum "$TARGET"
