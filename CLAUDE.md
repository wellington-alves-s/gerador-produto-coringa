# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A small internal tool for **Madel** (wood doors/frames retailer) sales staff to generate a printable "Encomenda Especial" (special order) document — a technical spec sheet / croqui (sketch) for custom products like doors (PORTA), window/door frames (ESQUADRIA), jambs (BATENTE), trim (GUARNIÇÃO), steps (DEGRAU), etc. — that gets signed by the customer and used internally for purchasing. All UI text and field names are in Portuguese (pt-BR).

There is no build system, package manager, or test framework. It's plain PHP + vanilla JS/CSS served directly by a PHP-capable web server (e.g. Apache/XAMPP or `php -S`).

## Running locally

```
php -S localhost:8000
```

Then open `http://localhost:8000/index.html`.

## Formatting

A `.prettierrc` is present (tabs, 100 print width, double quotes) for the HTML/CSS/JS files. Run via `npx prettier --write .` (no local `package.json`/`node_modules` — prettier runs via npx or a globally installed copy).

## Architecture / request flow

The **live flow** is:

1. `index.html` — the order form. A single `<select name="tipo">` drives which field groups are shown (via `js/form.js`), since different product types need different fields (e.g. PORTA needs `espessura_porta` and door-specific checkboxes; ESQUADRIA needs `tipo_palheta`/`vidros[]`; DEGRAU/PATAMAR relabel the generic altura/largura/profundidade inputs instead of adding new ones). The form POSTs directly (multipart, `target="_blank"`) to `croqui.php`.
2. `js/form.js` — all client-side form behavior: show/hide field groups per `tipo`, Brazilian-format number/currency masking (`0,000` / `0,00` style, comma decimal), mutual-exclusion checkboxes (SÓ FOLHA vs CONJUNTO, the `vidros[]` group), and image preview/upload wiring.
3. `croqui.php` — receives the POST directly (no database, no session for this path) and server-side renders the full printable document in one file (inline `<style>` + inline `<script>`). Field visibility on the printed doc again branches on `$tipo` (PORTA / ESQUADRIA / KIT DE CORRER / etc.), mirroring the branching in `form.js`. It also draws a simple CSS/JS mock diagram of the piece (`desenharCroqui()`) when no product image was attached. Printing/export uses `html2canvas` + `jsPDF` (loaded from CDN) to turn the rendered page into a downloadable PDF/PNG — there's no server-side PDF generation.
4. Product images: either uploaded fresh (saved into `uploads/`, filename prefixed with `time()`) or picked from `biblioteca_imagens.php`, a popup window that lists existing files in `uploads/` (filtered to jpg/jpeg/png/gif) and, on click, reaches back into the opener window via `window.opener` to fill the hidden `imagem-selecionada` field and preview — it does not communicate through the server at all.

**Legacy/dead code**, not part of the live flow above — don't assume they're wired together just because they share filenames:
- `processar.php` — an older alternate entry point that stores form data in `$_SESSION` and redirects to `croqui.php`. `croqui.php` never reads `$_SESSION`, only `$_POST`, so this path is non-functional as-is.
- `croqui.html` + `js/croqui.js` — a static, hardcoded example of the croqui layout (no PHP, fake sample data). Not linked from `index.html`'s real flow.
- `print.html` — standalone print helper expecting an image passed via a `?img=` query param; not currently invoked by any of the other pages.

**Known quirk in `js/form.js`**: the "Gerenciamento de imagem" block near the bottom references DOM ids (`preview`, `limpar-imagem`) that don't exist in `index.html` (which uses `preview-imagem`/`preview-container` instead, wired via an inline `<script>` in `index.html` itself). Calling `.addEventListener` on the resulting `null` throws inside the `DOMContentLoaded` handler, which silently aborts execution of everything after it in that handler — including the `criarCampoKitCorrer()` call at the end of the file. In practice this doesn't break the form because the code that already ran before the throw (field show/hide, number formatting, validation) is what actually matters; the static KIT DE CORRER fields in `index.html` work independently of the aborted dynamic-field code.

## Conventions

- Money and measurement inputs use Brazilian formatting (comma as decimal separator, e.g. `0,000` m, `0,00` R$) — formatting is done digit-by-digit in `js/form.js` (`formatarNumero`/`formatarPreco`), not via a library.
- `$tipo` (product type) is the central branch point on both the form (`js/form.js`) and the generated document (`croqui.php`); when adding a new product type or field, update both places, plus the corresponding `<option>` in `index.html`.
- `uploads/` holds both user-uploaded product photos and a pre-seeded library of stock product images shown in `biblioteca_imagens.php` — don't assume every file there came from a real customer order.
