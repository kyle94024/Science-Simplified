# Token study examples

One folder per paper. Each folder needs two files:

```
examples/
  barnes-2026-hs-pain/
    abstract.txt        # just the abstract (plain text)
    full.pdf            # the whole paper — .pdf, .docx, .txt, .md or .html all work
  plotkin-2025-starfish/
    abstract.md
    full.txt
```

Names are up to you; they become the row labels in the report. PDFs are
read with pdf-parse (text layer only — scanned PDFs need OCR first).

Then, from the repo root:

```
npm run token-study                 # every example, production prompt + model
npm run token-study -- --repeats 3  # see run-to-run spread (production uses temperature 0.7)
npm run token-study -- --dry-run    # local token counts only, no API calls
```

Results land in `scripts/token-study/results/<timestamp>/` — `report.md`
(token/cost table), `report.json` (everything incl. raw API usage), and
`preview.html` (abstract vs. full outputs side by side, styled like the site).

This folder and `results/` are git-ignored so papers never get committed.
