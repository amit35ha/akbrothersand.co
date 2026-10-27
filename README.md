# akbrothersand.co

Official welcome and enterprise gateway portal for **A. K. Brothers & Co.** — Govt. Licensed Electrical Contractor & General Order Supplier based in Kolkata, West Bengal.

## Overview
This portal serves as the primary landing page and high-speed network gateway for company internal tools, billing systems, and client services.

### Key Features
- **Official Corporate Branding**: High-fidelity UI with authentic company credentials (GSTIN: `19JBGPK7323L1Z2`, Kolkata registered office).
- **Interactive 60 FPS Canvas**: Dynamic electrical particle & power grid animation responding to mouse parallax.
- **10-Second Auto-Transit Countdown**: Automated timer with a visual progress bar and pause/resume control that redirects automatically to the destination host node.
- **Power Surge Redirection Sequence**: High-voltage transit HUD with rotating circuit rings, circular progress gauge, real-time telemetry stream, and whiteout flash.
- **Configurable Destination**: Built-in modal allowing quick selection or manual entry of target DNS domain or IP (persisted via `localStorage`).
- **Responsive & Lightweight**: Pure Vanilla HTML5, CSS3, and modern JavaScript without heavy framework dependencies.

## Structure
```
├── index.html     # Main markup and gateway structure
├── style.css      # Custom styling, animations, and responsive layout
├── script.js      # Particle canvas engine, countdown timer, and redirect logic
├── logo.png       # Official company logo
└── README.md      # Repository documentation
```

## Local Development
To preview locally:
```bash
# Using Python
python -m http.server 8085

# Using Node / npx
npx serve .
```
Then visit `http://localhost:8085` in your browser.
