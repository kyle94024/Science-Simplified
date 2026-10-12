-- Robust storage for article translations (2026-10). Additive and idempotent:
-- safe to run on every tenant DB, repeatedly.
--
--   node scripts/migrations/run-migration.js 2026-article-translations-v2.sql
--
-- What it adds (see src/lib/articleTranslations.js for how they're used):
--   source_hash       md5 of the exact English version a row was translated from
--                     (title + summary + body + a translation-version tag). A row
--                     is served only while it matches the article's current text,
--                     so an edit makes old translations stale automatically.
--   model             which model produced the translation
--   updated_at        when the translation was (re)generated
--   generating_since  claim marker: a request is generating this row right now
--                     (prevents two readers paying for the same translation)
--   FK → article      deleting or retracting an article deletes its translations.
--                     NOT VALID: enforced for new rows without touching the few
--                     legacy orphans; they are never read (reads join on article).

CREATE TABLE IF NOT EXISTS article_translations (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL,
    language VARCHAR NOT NULL,
    translated_title TEXT,
    translated_summary TEXT,
    translated_innertext TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (article_id, language)
);

ALTER TABLE article_translations
    ADD COLUMN IF NOT EXISTS source_hash TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS generating_since TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'article_translations_article_fk'
    ) THEN
        ALTER TABLE article_translations
            ADD CONSTRAINT article_translations_article_fk
            FOREIGN KEY (article_id) REFERENCES article (id) ON DELETE CASCADE NOT VALID;
    END IF;
END $$;

COMMENT ON COLUMN article_translations.source_hash IS
    'md5(version || chr(31) || title || chr(31) || summary || chr(31) || innertext) of the English article this row was translated from; stale when it no longer matches';
COMMENT ON COLUMN article_translations.generating_since IS
    'set while a request is generating this translation; a claim older than a few minutes is considered abandoned';
