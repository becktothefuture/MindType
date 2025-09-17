<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O   H E A D E R   R U L E  ░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Standard responsive header for demo pages
    • WHY  ▸ Consistent branding + metadata (version, last-updated)
    • HOW  ▸ Include shared CSS/JS and meta tags; title auto-fills
-->

### Usage

- Add to `<head>` of any `demo/*/index.html`:

```html
<meta name="mt-version" content="0.2.0-alpha" />
<meta name="mt-last-updated" content="2025-08-26T00:00:00.000Z" />
<link rel="stylesheet" href="../_shared/header.css" />
```

- Add right after `<body>`:

```html
<script src="../_shared/header.js" defer></script>
```

- Optional: set the page name explicitly:

```html
<body data-demo-title="My Demo Name"></body>
```

If not provided, the script uses the `<title>` or the URL path.

### Behavior

- Title shows the demo name inside `.title-wrapper`.
- Version reads from `meta[name="mt-version"]`.
- Last updated reads from `meta[name="mt-last-updated"]` (ISO) and is rendered in local time; if absent, uses `document.lastModified` fallback at runtime.
- Fully responsive; collapses right-side badges under 640px.

### Files

- `demo/_shared/header.css`
- `demo/_shared/header.js`

### Editor Automation

- `.cursorrules` ensures the header pattern is applied to `demo/**/index.html`. It injects meta tags, CSS, and JS includes using the current `package.json` version and the current timestamp.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
