from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / "game/webgl/js/main.js"
INDEX = ROOT / "game/webgl/index.html"
RUNTIME = ROOT / "game/webgl/src/menuAnthemRuntime.js"


def patch_main() -> None:
    source = MAIN.read_text(encoding="utf-8")
    source = source.replace(
        "const MENU_ANTHEM = 'music/menu-anthem.ogg';",
        "const MENU_ANTHEM = 'music/menu-anthem.mp3';",
    )

    replacement = """function startMenuMusic() {
  stopMusic();
  if (muted || !musicOn) return;
  // menuAnthemRuntime owns the only menu audio element. It handles autoplay,
  // looping, browser gesture recovery and stopping when gameplay starts.
  const start = () => window.KR3MenuAnthem?.autoplay?.();
  start();
  if (!window.KR3MenuAnthem) queueMicrotask(start);
}

function startMusic()"""
    source, count = re.subn(
        r"function startMenuMusic\(\) \{.*?\n\}\n\nfunction startMusic\(\)",
        replacement,
        source,
        count=1,
        flags=re.S,
    )
    if count != 1:
        raise SystemExit("startMenuMusic function anchor not found")

    for marker in (
        "const MENU_ANTHEM = 'music/menu-anthem.mp3';",
        "window.KR3MenuAnthem?.autoplay?.()",
    ):
        if marker not in source:
            raise SystemExit(f"Required main.js marker missing: {marker}")

    MAIN.write_text(source, encoding="utf-8")


def patch_index() -> None:
    html = INDEX.read_text(encoding="utf-8")

    # Remove the obsolete second HTMLAudio player if an older importer inserted it.
    html = re.sub(
        r"\n\s*<section id=\"kr3MenuPlayer\".*?</section>\s*\n",
        "\n",
        html,
        count=1,
        flags=re.S,
    )

    runtime_tag = '  <script type="module" src="src/menuAnthemRuntime.js"></script>'
    if runtime_tag not in html:
        anchor = '  <script type="module" src="js/main.js"></script>'
        if anchor not in html:
            raise SystemExit("main.js script anchor not found")
        html = html.replace(anchor, anchor + "\n" + runtime_tag, 1)

    if 'id="kr3MenuPlayer"' in html or 'id="kr3MenuAudio"' in html:
        raise SystemExit("Obsolete duplicate menu player remains in index.html")
    if runtime_tag not in html:
        raise SystemExit("menuAnthemRuntime script tag missing")

    INDEX.write_text(html, encoding="utf-8")


def verify_runtime() -> None:
    source = RUNTIME.read_text(encoding="utf-8")
    required = (
        "const LOCAL_SOURCE = 'music/menu-anthem.mp3';",
        "audio.loop = true;",
        "scheduleAutoplay",
        "bindGestureRecovery",
    )
    for marker in required:
        if marker not in source:
            raise SystemExit(f"Required menuAnthemRuntime marker missing: {marker}")


if __name__ == "__main__":
    patch_main()
    patch_index()
    verify_runtime()
    print("KR3 single-runtime MP3 menu integration complete.")
