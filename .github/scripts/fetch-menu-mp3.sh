#!/usr/bin/env bash
set -euo pipefail

VIDEO_ID='qcmwEXSbQ_U'
YOUTUBE_URL="https://www.youtube.com/watch?v=${VIDEO_ID}"
TARGET="${1:-game/webgl/music/menu-anthem.mp3}"
WORK="${RUNNER_TEMP:-/tmp}/kr3-menu-mp3"
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36'
mkdir -p "$WORK" "$(dirname "$TARGET")"
rm -rf "$WORK"/* "$TARGET"
source_file=''

curl_get() {
  curl -4 --http1.1 -fL --retry 2 --retry-all-errors --connect-timeout 10 --max-time "$1" \
    -A "$UA" -H 'Accept-Language: en-US,en;q=0.8' "${@:2}"
}

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

piped_instances() {
  cat <<'EOF'
https://pipedapi.kavin.rocks
https://pipedapi.leptons.xyz
https://pipedapi.nosebs.ru
https://pipedapi-libre.kavin.rocks
https://piped-api.privacy.com.de
https://pipedapi.adminforge.de
https://api.piped.yt
https://pipedapi.drgns.space
https://pipedapi.owo.si
https://pipedapi.ducks.party
https://piped-api.codespace.cz
https://pipedapi.reallyaweso.me
https://api.piped.private.coffee
https://pipedapi.darkness.services
https://pipedapi.orangenet.cc
https://api.piped.projectsegfau.lt
https://pipedapi.in.projectsegfau.lt
https://pipedapi.us.projectsegfau.lt
https://piped-api.hostux.net
https://pipedapi.simpleprivacy.fr
EOF
  curl_get 30 'https://raw.githubusercontent.com/TeamPiped/documentation/main/content/docs/public-instances/index.md' 2>/dev/null \
    | grep -Eo 'https://[A-Za-z0-9._-]+' || true
}

try_piped() {
  local api info media candidate count=0
  while IFS= read -r api; do
    test -n "$api" || continue
    count=$((count + 1))
    test "$count" -le 50 || break
    echo "Trying Piped ($count): $api"
    info="$WORK/piped-$count.json"
    candidate="$WORK/piped-source-$count"
    rm -f "$info" "$candidate"
    curl_get 50 "${api%/}/streams/${VIDEO_ID}" -o "$info" || continue
    jq -e '.audioStreams | type == "array"' "$info" >/dev/null 2>&1 || continue
    media="$(jq -r '[.audioStreams[]? | select(.url != null and .url != "") | select((.mimeType // "audio") | startswith("audio"))] | sort_by(.bitrate // 0) | last | .url // empty' "$info")"
    test -n "$media" || continue
    case "$media" in
      http://*|https://*) ;;
      /*) media="${api%/}${media}" ;;
      *) continue ;;
    esac
    curl_get 300 "$media" -H "Referer: ${api%/}/" -o "$candidate" || continue
    accept_candidate "$candidate" && return 0
  done < <(piped_instances | awk '!seen[$0]++')
  return 1
}

invidious_instances() {
  cat <<'EOF'
inv.nadeko.net
invidious.nerdvpn.de
yt.chocolatemoo53.com
invidious.tiekoetter.com
EOF
  curl_get 30 'https://api.invidious.io/instances.json?sort_by=health' 2>/dev/null \
    | jq -r '.[]? | select(.[1].api == true) | select((.[1].type // "https") == "https") | .[0]' 2>/dev/null || true
}

try_invidious() {
  local host info media candidate count=0
  while IFS= read -r host; do
    test -n "$host" || continue
    count=$((count + 1))
    test "$count" -le 35 || break
    echo "Trying Invidious ($count): $host"
    info="$WORK/invidious-$count.json"
    candidate="$WORK/invidious-source-$count"
    rm -f "$info" "$candidate"
    curl_get 50 "https://${host}/api/v1/videos/${VIDEO_ID}?local=true" -o "$info" || continue
    media="$(jq -r '[.adaptiveFormats[]? | select(.url != null and .url != "") | select((.type // "") | startswith("audio/"))] | sort_by(.bitrate // 0) | last | .url // empty' "$info" 2>/dev/null || true)"
    test -n "$media" || continue
    case "$media" in
      http://*|https://*) ;;
      /*) media="https://${host}${media}" ;;
      *) continue ;;
    esac
    curl_get 300 "$media" -H "Referer: https://${host}/" -o "$candidate" || continue
    accept_candidate "$candidate" && return 0
  done < <(invidious_instances | awk '!seen[$0]++')
  return 1
}

try_ytdlp() {
  local client candidate
  for client in web_music android_vr mweb web_safari web_embedded tv; do
    rm -f "$WORK"/ytdlp-source.*
    if yt-dlp --no-playlist --impersonate chrome --js-runtimes node \
        --remote-components ejs:github \
        --extractor-args "youtube:player_client=${client}" \
        -f 'bestaudio/best' -o "$WORK/ytdlp-source.%(ext)s" "$YOUTUBE_URL"; then
      candidate="$(find "$WORK" -maxdepth 1 -type f -name 'ytdlp-source.*' | head -n 1)"
      test -n "$candidate" && accept_candidate "$candidate" && return 0
    fi
  done
  return 1
}

try_piped || try_invidious || try_ytdlp || true

test -s "${source_file:-}" || {
  echo 'Unable to obtain the complete 4:14 anthem from distributed sources.' >&2
  exit 1
}

ffmpeg -y -v error -i "$source_file" -map 0:a:0 -vn \
  -c:a libmp3lame -b:a 96k -ar 44100 -ac 2 -map_metadata -1 \
  -id3v2_version 3 -metadata title='За краем орбит' \
  -metadata artist='Космические Рейнджеры 3 — Дети Эльтана' "$TARGET"

duration="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$TARGET")"
codec="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=nw=1:nk=1 "$TARGET")"
bitrate="$(ffprobe -v error -select_streams a:0 -show_entries stream=bit_rate -of default=nw=1:nk=1 "$TARGET")"
test "$codec" = 'mp3'
awk -v d="$duration" 'BEGIN { exit !(d >= 245.0 && d <= 265.0) }'
awk -v b="$bitrate" 'BEGIN { exit !(b >= 90000 && b <= 100000) }'
ffmpeg -v error -i "$TARGET" -f null - >/dev/null 2>&1
printf 'Verified final MP3: duration=%s sec bitrate=%s size=%s bytes\n' "$duration" "$bitrate" "$(stat -c%s "$TARGET")"
sha256sum "$TARGET"
