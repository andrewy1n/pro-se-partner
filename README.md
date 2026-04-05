# Pro Se Partner

Next.js app for the Pro Se Partner legal companion (see [`PROJECT.md`](./PROJECT.md) for product scope and architecture).

## Prerequisites

- **Node.js** (version aligned with `package.json` / CI)
- **qpdf** — rewrites xref tables so `pdf-lib` can load many Judicial Council PDFs. If `qpdf` is missing, the app falls back to raw bytes before `pdf-lib` (fill may still fail).
- **pdftk-java** — provides the `pdftk` CLI used when `pdf-lib` cannot parse a form (e.g. hybrid AcroForm/XFA). Auto-fill falls back to `pdftk fill_form` with an FDF file. The binary name is **`pdftk`** on all platforms.

### Installing qpdf

- **Windows (dev):** Install from [qpdf releases](https://github.com/qpdf/qpdf/releases) or `winget install QPDF.QPDF`, and ensure `qpdf` is on your `PATH` (e.g. restart the terminal after install).
- **macOS:** `brew install qpdf`
- **Linux:** `apt install qpdf` / `dnf install qpdf` (package name may vary)

### Installing pdftk-java

- **Windows:** `choco install pdftk-java` (Chocolatey), or install from [pdftk-java](https://gitlab.com/pdftk-java/pdftk) / your package manager; ensure `pdftk` is on `PATH`.
- **Linux / Docker:** `apt-get install pdftk-java` (Debian/Ubuntu) or your distro’s package.
- **macOS:** `brew install pdftk-java`

## Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` where applicable and set secrets (e.g. Browser Use API key).
