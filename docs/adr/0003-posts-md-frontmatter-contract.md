# Canonical Portfolio Entry contract: _posts/*.md with strict frontmatter

A `Portfolio Entry` is `_posts/*.md` with mandatory `---` YAML `Frontmatter` (`title`, `date:YYYY-MM-DD`, `techStack:string[]`, `summary`) and STAR body.

`src/lib/api.ts` previously filtered `.md` only but tolerated missing `---` (the 3 existing posts lack opening delimiters) and sorted by `stats.birthtime`. `content/projects/*.mdx` was never read. The LLM prompt could emit `*.mdx` with LLM-chosen filenames, allowing path traversal. We unify on `_posts/*.md`, server-controlled filenames (`YYYY-MM-DD-portfolio-update-<6hex>.md`), `TextEncoder`→`btoa` encoding, `GET sha` before `PUT`, runtime lenient parse with `console.warn`, and CI fail via `scripts/validate-posts.mjs` in `deploy.yml`. `content/projects/` is deleted.
