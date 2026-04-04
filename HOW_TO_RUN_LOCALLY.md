# How to Run Locally

City Heroes uses ES modules (`type="module"` script tags). Browsers block these when
opening files directly via `file://` due to CORS restrictions. You need a local HTTP
server. Pick whichever option suits you.

---

## Option 1 — VS Code Live Server (easiest, no terminal)

1. Install the **Live Server** extension by Ritwick Dey in VS Code.
2. Open the `city-heroes` folder in VS Code.
3. Right-click `index.html` in the Explorer panel → **Open with Live Server**.
4. The game opens automatically at `http://127.0.0.1:5500`.

---

## Option 2 — Python (no installs if Python is already on your system)

Open a terminal in the `city-heroes` folder and run:

**Python 3:**
```bash
python -m http.server 8000
```

**Python 2:**
```bash
python -m SimpleHTTPServer 8000
```

Then open `http://localhost:8000` in your browser.

---

## Option 3 — Node.js `serve` (one-time install)

```bash
npx serve .
```

Then open the URL printed in the terminal (usually `http://localhost:3000`).

---

## Option 4 — Node.js `http-server`

```bash
npx http-server . -p 8000
```

Then open `http://localhost:8000`.

---

## Why `file://` doesn't work

Browsers enforce a same-origin policy on ES modules. When loaded via `file://`, each
file is treated as a separate origin, causing the browser to block module imports with
a CORS error. A local HTTP server serves all files from the same origin
(`http://localhost`) which resolves this.

If you open `index.html` directly and the game does not load, check the browser
console (F12) for an error like:

```
Cross-Origin Request Blocked ... (Reason: CORS request not http)
```

That confirms you need one of the server options above.
