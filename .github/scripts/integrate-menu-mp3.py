from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN = ROOT / "game/webgl/js/main.js"
INDEX = ROOT / "game/webgl/index.html"


def patch_main() -> None:
    source = MAIN.read_text(encoding="utf-8")
    source = source.replace(
        "const MENU_ANTHEM = 'music/menu-anthem.ogg';",
        "const MENU_ANTHEM = 'music/menu-anthem.mp3';",
    )

    old_audio = "  const a = new Audio(MENU_ANTHEM);\n  a.loop = true;"
    new_audio = (
        "  const a = document.getElementById('kr3MenuAudio') || new Audio(MENU_ANTHEM);\n"
        "  if (!a.getAttribute('src')) a.src = MENU_ANTHEM;\n"
        "  a.loop = true;"
    )
    if old_audio in source:
        source = source.replace(old_audio, new_audio, 1)
    elif "document.getElementById('kr3MenuAudio')" not in source:
        raise SystemExit("startMenuMusic audio anchor not found")

    old_cleanup = (
        "      musicAudio.pause();\n"
        "      musicAudio.removeAttribute('src');\n"
        "      musicAudio.load();"
    )
    new_cleanup = (
        "      musicAudio.pause();\n"
        "      if (musicAudio.id === 'kr3MenuAudio') {\n"
        "        musicAudio.currentTime = 0;\n"
        "      } else {\n"
        "        musicAudio.removeAttribute('src');\n"
        "        musicAudio.load();\n"
        "      }"
    )
    source = source.replace(old_cleanup, new_cleanup)

    required = (
        "const MENU_ANTHEM = 'music/menu-anthem.mp3';",
        "document.getElementById('kr3MenuAudio')",
        "musicAudio.id === 'kr3MenuAudio'",
    )
    for marker in required:
        if marker not in source:
            raise SystemExit(f"Required main.js marker missing: {marker}")

    MAIN.write_text(source, encoding="utf-8")


def patch_index() -> None:
    html = INDEX.read_text(encoding="utf-8")
    player_lines = [
        '        <section id="kr3MenuPlayer" aria-label="Музыкальный плеер главного меню" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation()" style="width:min(460px,86vw);margin:8px auto 2px;padding:9px 12px 10px;border:1px solid rgba(255,215,122,.42);border-radius:12px;background:linear-gradient(180deg,rgba(15,26,54,.84),rgba(4,8,20,.9));box-shadow:0 10px 28px rgba(0,0,0,.38),inset 0 0 22px rgba(65,130,255,.08);box-sizing:border-box">',
        '          <div style="font:700 12px/1.25 \'Exo 2\',sans-serif;letter-spacing:.12em;color:#ffd77a;text-align:center;margin-bottom:6px">♫ ЗА КРАЕМ ОРБИТ · ГИМН КР3</div>',
        '          <audio id="kr3MenuAudio" src="music/menu-anthem.mp3" controls loop preload="auto" controlslist="nodownload noplaybackrate" style="display:block;width:100%;height:38px;accent-color:#ffd77a">Ваш браузер не поддерживает MP3-плеер.</audio>',
        '          <div style="margin-top:5px;font:400 10px/1.2 \'Exo 2\',sans-serif;letter-spacing:.08em;color:#9fb8e8;text-align:center">Полная версия · 4:14 · MP3 · 96 кбит/с</div>',
        '        </section>',
    ]
    player = "\n".join(player_lines) + "\n"

    if 'id="kr3MenuPlayer"' not in html:
        anchor = '        <div class="ver">'
        if anchor not in html:
            raise SystemExit("Menu version anchor not found")
        html = html.replace(anchor, player + anchor, 1)
    else:
        html = html.replace("music/menu-anthem.ogg", "music/menu-anthem.mp3")

    for marker in ('id="kr3MenuPlayer"', 'id="kr3MenuAudio"', 'src="music/menu-anthem.mp3"'):
        if marker not in html:
            raise SystemExit(f"Required index marker missing: {marker}")

    INDEX.write_text(html, encoding="utf-8")


if __name__ == "__main__":
    patch_main()
    patch_index()
    print("KR3 WebGL MP3 menu player integration complete.")
