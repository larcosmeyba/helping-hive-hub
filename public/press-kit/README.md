# Help The Hive — Press Kit Assets

This directory contains brand assets for press, media, and partner use.

## Required files (add manually)
- `logo.svg` — primary logo (vector)
- `logo.png` — primary logo (1024×1024 PNG with transparency)
- `logo-mark.svg` — icon-only mark
- `wordmark.svg` — wordmark only, no icon
- `screenshot-1.png` through `screenshot-6.png` — product screenshots (1440×900)
- `brand-guide.pdf` — color palette + typography one-pager

## Build the ZIP
Once all assets are in place, run:

```bash
cd public/press-kit && zip -r ../press-kit.zip ./*
```

This creates `public/press-kit.zip` which the /press page links to. Once the
ZIP exists, re-enable the "Download press kit" button on `src/pages/Press.tsx`.
