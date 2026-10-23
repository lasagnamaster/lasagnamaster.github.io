"""Rebuild standalone HTML and source ZIP. Python standard library only."""
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parent
SOURCES = [
    'index.html', 'style.css', 'engine.js', 'challenge.js', 'app.js',
    'README.md', 'identified.json', 'test-model.cjs', 'test-challenge.cjs', 'build.py',
]

def build():
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="style.css">',
                        '<style>\n' + (ROOT / 'style.css').read_text(encoding='utf-8') + '\n</style>')
    for name in ['engine.js', 'challenge.js', 'app.js']:
        html = html.replace(f'<script src="{name}"></script>',
                            '<script>\n' + (ROOT / name).read_text(encoding='utf-8') + '\n</script>')
    assert not re.search(r'<script[^>]+src=|<link[^>]+href=', html)
    (ROOT / 'thermal-house.html').write_text(html, encoding='utf-8')
    with zipfile.ZipFile(ROOT / 'thermal-house-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for name in SOURCES + ['thermal-house.html']:
            archive.write(ROOT / name, Path('presentation') / name)
    print('Built thermal-house.html and thermal-house-source.zip')

if __name__ == '__main__':
    build()
