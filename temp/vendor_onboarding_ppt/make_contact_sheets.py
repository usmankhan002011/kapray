from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import re

ROOT = Path(r"C:\DEV\kapray\kapray\assets\Kapray vendors onboarfing_extracted images")
OUT = Path(r"C:\DEV\kapray\kapray\temp\vendor_onboarding_ppt\contact_sheets")
CHAT = ROOT / "WhatsApp Chat with Kapray vendors onboarfing.txt"

SECTIONS = [
    ("unstitched_plain", "UNSTITCHED PLAIN"),
    ("unstitched_dyeing_tailoring", "UNSTITCHED_DYEING_TAILORING"),
    ("stitched_ready_to_wear", "STITCHED READY TO WEAR"),
    ("stitched_made_on_order", "STITCHED MADE ON ORDER"),
]


def natural_key(value):
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", value)]


def parse_groups():
    text = CHAT.read_text(encoding="utf-8", errors="replace")
    current = None
    groups = {key: [] for key, _ in SECTIONS}
    for line in text.splitlines():
        for key, marker in SECTIONS:
            if marker in line:
                current = key
        match = re.search(r"(IMG-[0-9A-Z-]+\.jpg)", line)
        if match and current:
            img = ROOT / match.group(1)
            if img.exists():
                groups[current].append(img)
    return groups


def make_sheet(paths, out_path, columns=5, thumb=(210, 374), margin=18, gap=14):
    rows = (len(paths) + columns - 1) // columns
    label_h = 30
    w = margin * 2 + columns * thumb[0] + (columns - 1) * gap
    h = margin * 2 + rows * (thumb[1] + label_h) + (rows - 1) * gap
    canvas = Image.new("RGB", (w, h), "white")
    draw = ImageDraw.Draw(canvas)
    try:
        font = ImageFont.truetype("arial.ttf", 13)
    except Exception:
        font = ImageFont.load_default()

    for idx, path in enumerate(paths):
        row, col = divmod(idx, columns)
        x = margin + col * (thumb[0] + gap)
        y = margin + row * (thumb[1] + label_h + gap)
        image = Image.open(path).convert("RGB")
        image = ImageOps.contain(image, thumb, Image.Resampling.LANCZOS)
        px = x + (thumb[0] - image.width) // 2
        py = y + (thumb[1] - image.height) // 2
        canvas.paste(image, (px, py))
        draw.rectangle((px, py, px + image.width, py + image.height), outline=(150, 150, 150), width=1)
        label = path.stem.replace("IMG-", "")
        draw.text((x, y + thumb[1] + 6), f"{idx + 1:02d}  {label}", fill=(0, 0, 0), font=font)

    canvas.save(out_path, quality=92)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    groups = parse_groups()
    manifest_lines = []
    for key, paths in groups.items():
        paths = sorted(paths, key=lambda p: natural_key(p.name))
        manifest_lines.append(f"{key}: {len(paths)}")
        for index, path in enumerate(paths, 1):
            manifest_lines.append(f"  {index:02d} {path.name}")
        for chunk_start in range(0, len(paths), 25):
            chunk = paths[chunk_start : chunk_start + 25]
            out_path = OUT / f"{key}_{chunk_start // 25 + 1}.jpg"
            make_sheet(chunk, out_path)
            manifest_lines.append(f"  sheet {chunk_start // 25 + 1}: {out_path}")
    (OUT / "manifest.txt").write_text("\n".join(manifest_lines), encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
