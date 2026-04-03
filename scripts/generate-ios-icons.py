#!/usr/bin/env python3
"""Generate all required iOS AppIcon sizes from source logo."""
import json
import os
import sys
from PIL import Image

SOURCE = sys.argv[1] if len(sys.argv) > 1 else "src/assets/logo.png"
ASSET_DIR = "ios/App/App/Assets.xcassets/AppIcon.appiconset"

# All sizes required for a universal iOS app icon (Xcode 15+)
ICONS = [
    {"points": 20, "scale": 2, "idiom": "iphone"},
    {"points": 20, "scale": 3, "idiom": "iphone"},
    {"points": 29, "scale": 2, "idiom": "iphone"},
    {"points": 29, "scale": 3, "idiom": "iphone"},
    {"points": 40, "scale": 2, "idiom": "iphone"},
    {"points": 40, "scale": 3, "idiom": "iphone"},
    {"points": 60, "scale": 2, "idiom": "iphone"},
    {"points": 60, "scale": 3, "idiom": "iphone"},
    {"points": 20, "scale": 1, "idiom": "ipad"},
    {"points": 20, "scale": 2, "idiom": "ipad"},
    {"points": 29, "scale": 1, "idiom": "ipad"},
    {"points": 29, "scale": 2, "idiom": "ipad"},
    {"points": 40, "scale": 1, "idiom": "ipad"},
    {"points": 40, "scale": 2, "idiom": "ipad"},
    {"points": 76, "scale": 1, "idiom": "ipad"},
    {"points": 76, "scale": 2, "idiom": "ipad"},
    {"points": 83.5, "scale": 2, "idiom": "ipad"},
    {"points": 1024, "scale": 1, "idiom": "ios-marketing"},
]


def format_points(points):
    return str(int(points)) if float(points).is_integer() else str(points).replace(".", "_")


def flatten_icon(image, size):
    resized = image.resize((size, size), Image.LANCZOS)
    if resized.mode != "RGBA":
        return resized.convert("RGB")

    background = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    composited = Image.alpha_composite(background, resized)
    return composited.convert("RGB")

def main():
    os.makedirs(ASSET_DIR, exist_ok=True)
    src = Image.open(SOURCE).convert("RGBA")
    
    contents_images = []
    for icon in ICONS:
        points = icon["points"]
        scale = icon["scale"]
        px = int(round(points * scale))
        points_label = format_points(points)
        filename = f"icon-{icon['idiom']}-{points_label}@{scale}x.png"

        flattened = flatten_icon(src, px)
        flattened.save(os.path.join(ASSET_DIR, filename), "PNG")
        print(f"  Generated {filename} ({px}x{px})")
        
        contents_images.append({
            "filename": filename,
            "idiom": icon["idiom"],
            "scale": f"{scale}x",
            "size": f"{str(points).replace('_', '.')}x{str(points).replace('_', '.')}"
        })
    
    contents = {
        "images": contents_images,
        "info": {"author": "xcode", "version": 1}
    }
    
    with open(os.path.join(ASSET_DIR, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
    
    print(f"\nGenerated {len(ICONS)} icon files + Contents.json in {ASSET_DIR}")

if __name__ == "__main__":
    main()
