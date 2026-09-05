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
https://pipedapi.tokhmi.xyz
https://pipedapi.moomoo.me
https://pipedapi.syncpundit.io
https://api-piped.mha.fi
https://piped-api.garudalinux.org
https://pipedapi.rivo.lol
https://pipedapi.leptons.xyz
https://pipedapi.nosebs.ru
https://piped-api.privacy.com.de
https://pipedapi.adminforge.de
https://api.piped.yt
https://pipedapi.drgns.space
https://pipedapi.owo.si
https://pipedapi.ducks.party
https://piped-api.codespace.cz
https://api.piped.private.coffee
https://pipedapi.darkness.services
https://pipedapi.orangenet.cc
https://api.piped.projectsegfau.lt
https://pipedapi.in.projectsegfau.lt
https://pipedapi.us.projectsegfau.lt
https://piped-api.hostux.net
https://pipedapi.simpleprivacy.fr
EOF
}

probe_piped() {
  local n="$1" api="$2"
  curl -4 --http1.1 -fsSL --retry 1 --retry-all-errors --connect-timeout 5 --max-time 18 \
    -A "$UA" -H 'Accept: application/json' "${api%/}/streams/${VIDEO_ID}" \
    -o "$WORK/piped-${n}.json" || rm -f "$WORK/piped-${n}.json"
}
export -f probe_piped
export VIDEO_ID WORK UA

try_piped() {
  local n=0 api info media candidate
  while IFS= read -r api; do
    test -n "$api" || continue
    n=$((n + 1))
    printf '%s\t%s\n' "$n" "$api"
  done < <(piped_instances | awk '!seen[$0]++') \
    | xargs -P 12 -n 2 bash -c 'probe_piped "$1" "$2"' _

  for info in "$WORK"/piped-*.json; do
    test -s "$info" || continue
    media="$(jq -r '[.audioStreams[]? | select(.url != null and .url != "") | select((.mimeType // "audio") | startswith("audio"))] | sort_by(.bitrate // 0) | last | .url // empty' "$info" 2>/dev/null || true)"
    test -n "$media" || continue
    candidate="$WORK/piped-source-$(basename "$info" .json)"
    echo "Downloading Piped audio candidate from ${media%%\?*}"
    curl -4 --http1.1 -fL --retry 2 --retry-all-errors --connect-timeout 8 --max-time 240 \
      -A "$UA" "$media" -o "$candidate" || { rm -f "$candidate"; continue; }
    accept_candidate "$candidate" && return 0
  done
  return 1
}

invidious_instances() {
  cat <<'EOF'
inv.nadeko.net
invidious.nerdvpn.de
yt.chocolatemoo53.com
invidious.tiekoetter.com
EOF
}

probe_invidious() {
  local n="$1" host="$2"
  curl -4 --http1.1 -fsSL --retry 1 --retry-all-errors --connect-timeout 5 --max-time 18 \
    -A "$UA" -H 'Accept: application/json' \
    "https://${host}/api/v1/videos/${VIDEO_ID}?local=true" \
    -o "$WORK/invidious-${n}.json" || rm -f "$WORK/invidious-${n}.json"
}
export -f probe_invidious

try_invidious() {
  local n=0 host info media candidate
  while IFS= read -r host; do
    test -n "$host" || continue
    n=$((n + 1))
    printf '%s\t%s\n' "$n" "$host"
  done < <(invidious_instances | awk '!seen[$0]++') \
    | xargs -P 4 -n 2 bash -c 'probe_invidious "$1" "$2"' _

  for info in "$WORK"/invidious-*.json; do
    test -s "$info" || continue
    media="$(jq -r '[.adaptiveFormats[]? | select(.url != null and .url != "") | select((.type // "") | startswith("audio/"))] | sort_by(.bitrate // 0) | last | .url // empty' "$info" 2>/dev/null || true)"
    test -n "$media" || continue
    candidate="$WORK/invidious-source-$(basename "$info" .json)"
    curl -4 --http1.1 -fL --retry 2 --retry-all-errors --connect-timeout 8 --max-time 240 \
      -A "$UA" "$media" -o "$candidate" || { rm -f "$candidate"; continue; }
    accept_candidate "$candidate" && return 0
  done
  return 1
}

try_ytdlp() {
  local client candidate
  for client in web_music android_vr mweb web_safari web_embedded tv; do
    rm -f "$WORK"/ytdlp-source.*
    if timeout 70s yt-dlp --no-playlist --impersonate chrome --js-runtimes node \
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
