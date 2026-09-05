#!/usr/bin/env bash
set -euo pipefail

VIDEO_ID='qcmwEXSbQ_U'
URL="https://www.youtube.com/watch?v=${VIDEO_ID}"
TARGET="${1:-game/webgl/music/menu-anthem.mp3}"
WORK="${RUNNER_TEMP:-/tmp}/kr3-menu-mp3"
UA='KR3-Audio-Importer/1.0 (+https://github.com/Energotron/space_rangers3)'
mkdir -p "$WORK" "$(dirname "$TARGET")"
rm -rf "$WORK"/* "$TARGET"

source_file=''

valid_audio() {
  local file="$1" duration
  test -s "$file" || return 1
  duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$file" 2>/dev/null || true)"
  test -n "$duration" || return 1
  awk -v d="$duration" 'BEGIN { exit !(d >= 245.0 && d <= 265.0) }' || return 1
  ffmpeg -v error -i "$file" -map 0:a:0 -f null - >/dev/null 2>&1 || return 1
  printf 'Accepted source: %s (%s sec, %s bytes)\n' "$file" "$duration" "$(stat -c%s "$file")"
}

accept_candidate() {
  local candidate="$1"
  if valid_audio "$candidate"; then
    source_file="$candidate"
    return 0
  fi
  rm -f "$candidate"
  return 1
}

try_ytdlp() {
  local client candidate
  for client in tv tv_embedded mweb web_safari android_vr web_embedded 'tv,web_safari' 'mweb,web_embedded'; do
    rm -f "$WORK"/ytdlp-source.*
    if yt-dlp --no-playlist --impersonate chrome --js-runtimes node \
        --remote-components ejs:github \
        --extractor-args "youtube:player_client=${client}" \
        -f 'bestaudio/best' -o "$WORK/ytdlp-source.%(ext)s" "$URL"; then
      candidate="$(find "$WORK" -maxdepth 1 -type f -name 'ytdlp-source.*' | head -n 1)"
      test -n "$candidate" && accept_candidate "$candidate" && return 0
    fi
  done
  return 1
}

try_cobalt() {
  local list="$WORK/cobalt-instances.json" base response status media candidate count=0
  curl -fsSL --retry 2 --connect-timeout 10 --max-time 45 \
    -A "$UA" 'https://instances.cobalt.best/api/instances.json' -o "$list" || return 1

  while IFS= read -r base; do
    test -n "$base" || continue
    count=$((count + 1))
    test "$count" -le 35 || break
    echo "Trying Cobalt: $base"
    response="$WORK/cobalt-response.json"
    candidate="$WORK/cobalt-source-$count"
    rm -f "$response" "$candidate"
    curl -fsS --retry 1 --connect-timeout 8 --max-time 45 \
      -A "$UA" -H 'Accept: application/json' -H 'Content-Type: application/json' \
      -H 'Origin: https://cobalt.tools' -H 'Referer: https://cobalt.tools/' \
      --data "{\"url\":\"$URL\",\"downloadMode\":\"audio\",\"audioFormat\":\"best\",\"filenameStyle\":\"basic\",\"alwaysProxy\":true,\"youtubeBetterAudio\":true}" \
      "${base%/}/" -o "$response" || continue
    status="$(jq -r '.status // empty' "$response" 2>/dev/null || true)"
    media="$(jq -r '.url // empty' "$response" 2>/dev/null || true)"
    case "$status" in
      redirect|tunnel) ;;
      *) continue ;;
    esac
    test -n "$media" || continue
    curl -fL --retry 2 --connect-timeout 10 --max-time 240 \
      -A "$UA" -H 'Referer: https://cobalt.tools/' "$media" -o "$candidate" || continue
    accept_candidate "$candidate" && return 0
  done < <(
    jq -r '
      .[]?
      | select((.online == true) or (.online.api == true))
      | select((.info.auth // false) == false)
      | select((.services.youtube == true) or (.services.youtube == "true"))
      | "\(.protocol // "https")://\(.api)"
    ' "$list" 2>/dev/null | awk '!seen[$0]++'
  )
  return 1
}

try_invidious() {
  local list="$WORK/invidious-instances.json" host info media candidate count=0
  curl -fsSL --retry 2 --connect-timeout 10 --max-time 45 \
    -A "$UA" 'https://api.invidious.io/instances.json?sort_by=health' -o "$list" || return 1

  while IFS= read -r host; do
    test -n "$host" || continue
    count=$((count + 1))
    test "$count" -le 45 || break
    echo "Trying Invidious: $host"
    info="$WORK/invidious-$count.json"
    candidate="$WORK/invidious-source-$count"
    rm -f "$info" "$candidate"
    curl -fsSL --retry 1 --connect-timeout 8 --max-time 45 -A "$UA" \
      "https://${host}/api/v1/videos/${VIDEO_ID}?local=true" -o "$info" || continue
    media="$(jq -r '[.adaptiveFormats[]? | select((.type // "") | startswith("audio/")) | select(.url != null)] | sort_by(.bitrate // 0) | last | .url // empty' "$info" 2>/dev/null || true)"
    test -n "$media" || continue
    curl -fL --retry 2 --connect-timeout 10 --max-time 240 -A "$UA" \
      -H "Referer: https://${host}/" "$media" -o "$candidate" || continue
    accept_candidate "$candidate" && return 0
  done < <(
    jq -r '.[]? | select(.[1].api == true) | select((.[1].type // "https") == "https") | .[0]' "$list" 2>/dev/null | awk '!seen[$0]++'
  )
  return 1
}

try_piped() {
  local list="$WORK/piped-instances.json" api info media candidate count=0
  curl -fsSL --retry 2 --connect-timeout 10 --max-time 45 \
    -A "$UA" 'https://piped.video/api/v1/instances' -o "$list" || return 1

  while IFS= read -r api; do
    test -n "$api" || continue
    count=$((count + 1))
    test "$count" -le 45 || break
    echo "Trying Piped: $api"
    info="$WORK/piped-$count.json"
    candidate="$WORK/piped-source-$count"
    rm -f "$info" "$candidate"
    curl -fsSL --retry 1 --connect-timeout 8 --max-time 45 -A "$UA" \
      "${api%/}/streams/${VIDEO_ID}" -o "$info" || continue
    media="$(jq -r '[.audioStreams[]? | select(.url != null)] | sort_by(.bitrate // 0) | last | .url // empty' "$info" 2>/dev/null || true)"
    test -n "$media" || continue
    curl -fL --retry 2 --connect-timeout 10 --max-time 240 -A "$UA" "$media" -o "$candidate" || continue
    accept_candidate "$candidate" && return 0
  done < <(
    jq -r '.[]? | .api_url // .apiUrl // empty' "$list" 2>/dev/null | awk '!seen[$0]++'
  )
  return 1
}

try_ytdlp || try_cobalt || try_invidious || try_piped || true

test -s "${source_file:-}" || {
  echo 'Unable to obtain the complete 4:14 anthem from any verified source.' >&2
  exit 1
}

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
printf 'Verified final MP3: duration=%s sec bitrate=%s size=%s bytes\n' "$duration" "$bitrate" "$(stat -c%s "$TARGET")"
sha256sum "$TARGET"
