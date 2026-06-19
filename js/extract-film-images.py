import re
import json
from pathlib import Path

content = (Path(__file__).resolve().parent.parent / "tfc.html").read_text(encoding="utf-8", errors="ignore")

film_images = {}
skip = ("image%20115", "DERVISH", "klkl", ".svg", "klkl12333")

def clean_slug(raw):
    return raw.strip().replace(" ", "")

def ok(url):
    return url and not any(s in url for s in skip)

# 1) Trailer tabs — poster follows the film link
for m in re.finditer(r'href="/twf-films/([^"]+)"', content):
    slug = clean_slug(m.group(1))
    if slug in film_images:
        continue
    window = content[m.end(): m.end() + 3500]
    img_m = re.search(r'class="trailer-image"[^>]*src="([^"]+)"', window)
    if img_m and ok(img_m.group(1)):
        film_images[slug] = img_m.group(1)

# 2) Map popups — popup-img + film link in same block
for block in re.findall(r'class="location-popup[\s\S]{0,5000}?href="/twf-films/([^"]+)"[\s\S]{0,2000}', content):
    pass

for block in re.finditer(r'class="location-popup[^"]*"[\s\S]{0,6000}?href="/twf-films/([^"]+)"', content):
    slug = clean_slug(block.group(1))
    chunk = block.group(0)
    img_m = re.search(r'class="popup-img"[^>]*src="([^"]+)"', chunk)
    if not img_m:
        img_m = re.search(r'src="(https://cdn\.prod\.website-files\.com/[^"]+)"[^>]*class="popup-img"', chunk)
    if img_m and ok(img_m.group(1)):
        film_images.setdefault(slug, img_m.group(1))

# 3) Hero slides — banner image before/after film link in same slide block
for block in re.finditer(r'class="[^"]*homepage-banner[^"]*"[\s\S]{0,12000}?href="/twf-films/([^"]+)"[\s\S]{0,12000}', content):
    slug = clean_slug(block.group(1))
    chunk = block.group(0)
    imgs = re.findall(r'src="(https://cdn\.prod\.website-files\.com/[^"]+)"', chunk)
    for img in imgs:
        if ok(img) and "homepage-banner-video" not in chunk[:chunk.find(img)]:
            film_images.setdefault(slug, img)
            break

# 4) Any remaining: backward image search near link
all_slugs = sorted(set(clean_slug(s) for s in re.findall(r'href="/twf-films/([^"?#]+)"', content) if s.strip()))
for slug in all_slugs:
    if slug in film_images:
        continue
    for m in re.finditer(rf'href="/twf-films/\s*{re.escape(slug)}"', content):
        start = max(0, m.start() - 4000)
        chunk = content[start:m.end() + 2000]
        imgs = re.findall(r'src="(https://cdn\.prod\.website-files\.com/[^"]+)"', chunk)
        for img in reversed(imgs):
            if ok(img):
                film_images[slug] = img
                break
        if slug in film_images:
            break

missing = [s for s in all_slugs if s not in film_images]
print(f"slugs: {len(all_slugs)}, mapped: {len(film_images)}, missing: {len(missing)}")

out = Path(__file__).resolve().parent / "films-images.js"
out.write_text("window.TFC_FILM_IMAGES = " + json.dumps(film_images, indent=2) + ";\n", encoding="utf-8")
print(f"Wrote {out}")