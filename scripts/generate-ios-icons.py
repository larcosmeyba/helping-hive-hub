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
    # iPhone notifications
    {"size": 40, "scale": 2, "idiom": "iphone"},
    {"size": 40, "scale": 3, "idiom": "iphone"},
    # iPhone settings
    {"size": 58, "scale": 2, "idiom": "iphone"},
    {"size": 58, "scale": 3, "idiom": "iphone"},
    # iPhone Spotlight
    {"size": 80, "scale": 2, "idiom": "iphone"},
    {"size": 80, "scale": 3, "idiom": "iphone"},
    # iPhone App
    {"size": 120, "scale": 2, "idiom": "iphone"},
    {"size": 120, "scale": 3, "idiom": "iphone"},
    # iPhone (iOS 7+)
    {"size": 180, "scale": 3, "idiom": "iphone"},
    # iPad notifications
    {"size": 20, "scale": 1, "idiom": "ipad"},
    {"size": 40, "scale": 2, "idiom": "ipad"},
    # iPad settings
    {"size": 29, "scale": 1, "idiom": "ipad"},
    {"size": 58, "scale": 2, "idiom": "ipad"},
    # iPad Spotlight
    {"size": 40, "scale": 1, "idiom": "ipad"},
    {"size": 80, "scale": 2, "idiom": "ipad"},
    # iPad App
    {"size": 76, "scale": 1, "idiom": "ipad"},
    {"size": 152, "scale": 2, "idiom": "ipad"},
    # iPad Pro
    {"size": 167, "scale": 2, "idiom": "ipad"},
    # App Store
    {"size": 1024, "scale": 1, "idiom": "ios-marketing"},
]

def main():
    os.makedirs(ASSET_DIR, exist_ok=True)
    src = Image.open(SOURCE).convert("RGBA")
    
    contents_images = []
    seen = set()
    
    for icon in ICONS:
        px = icon["size"]
        filename = f"icon-{px}.png"
        
        if filename not in seen:
            resized = src.resize((px, px), Image.LANCZOS)
            # iOS icons must not have alpha channel (except marketing)
            if icon["idiom"] != "ios-marketing":
                bg = Image.new("RGB", (px, px), (255, 255, 255))
                bg.paste(resized, mask=resized.split()[3] if resized.mode == "RGBA" else None)
                bg.save(os.path.join(ASSET_DIR, filename), "PNG")
            else:
                resized.convert("RGB").save(os.path.join(ASSET_DIR, filename), "PNG")
            seen.add(filename)
            print(f"  Generated {filename} ({px}x{px})")
        
        # Determine the "size" field for Contents.json (points)
        scale = icon["scale"]
        points = px // scale if scale > 1 else px
        
        contents_images.append({
            "filename": filename,
            "idiom": icon["idiom"],
            "scale": f"{scale}x",
            "size": f"{points}x{points}"
        })
    
    contents = {
        "images": contents_images,
        "info": {"author": "xcode", "version": 1}
    }
    
    with open(os.path.join(ASSET_DIR, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
    
    print(f"\nGenerated {len(seen)} icon files + Contents.json in {ASSET_DIR}")

if __name__ == "__main__":
    main()
