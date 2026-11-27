# ChatGPT → Blog → GitHub Pages

This repository is the **public, publish-only destination** for approved articles. The existing site and deployment pipeline live at:

- Site: https://dheerajkumar1a1a.github.io/dkr_Portfolio/
- Repository: https://github.com/dheerajkumar1a1a/dkr_Portfolio
- Article folder: `_posts/`
- Reusable editorial prompt: `prompts/chat-to-blog.md`

The current site expects the front matter contract below. Keep it compatible unless the site schema is deliberately changed.

## 1. Publish from a new or current ChatGPT conversation

1. In the conversation that contains useful research, analysis, lessons or original thinking, ask: **“Turn this conversation into a blog draft using the publishing rules in my dkr_Portfolio repository. Do not publish yet.”**
2. ChatGPT should read `prompts/chat-to-blog.md`, identify the strongest publishable angle, verify material factual claims where needed, and prepare the complete Markdown article plus a LinkedIn post.
3. Review factual claims, privacy, names, numbers, sources and tone. Correct anything that is not supported by the conversation or a reliable source.
4. Publish only after you explicitly say: **“APPROVE FOR PUBLICATION.”**
5. With the GitHub connection available, ask ChatGPT to create a new file in `dheerajkumar1a1a/dkr_Portfolio` under `_posts/YYYY-MM-DD-short-descriptive-slug.md`. Otherwise, paste the approved Markdown into GitHub's web editor and commit it to `main`.
6. Check the repository's Actions tab. The Pages build must succeed before you treat the article as live. Open the site and confirm the new entry appears.

A prompt is an instruction, not a native slash command. You can type `/blog` as your own shorthand for the instruction above.

## 2. Required article format

Every published article must use this exact front matter shape:

    ---
    title: "A clear, specific article title"
    date: "2026-11-27"
    techStack: ["Business Strategy", "Food Technology"]
    summary: "A useful one-sentence description under 200 characters."
    ---

- `title`: quoted string.
- `date`: quoted `YYYY-MM-DD` string.
- `techStack`: non-empty array of 1–8 strings. The current site displays this as topic labels, so use broad topics such as `AI`, `Business Strategy`, `Automation`, `Food Technology`, `Entrepreneurship` or `Engineering`.
- `summary`: concise quoted string, under 200 characters.
- Body: Markdown with a strong opening, descriptive headings, concrete reasoning/examples, limitations, conclusion and source links when factual claims require them.

The current validator expects `title`, `date`, `techStack` and `summary`. Do not add arbitrary front matter fields until the validator and site renderer support them.

## 3. Editorial and privacy gate

The public repository is visible to everyone. Never publish raw conversation exports, transcripts, screenshots, private notes, credentials, personal identifiers, private addresses, or confidential employer/client information.

Before drafting, exclude or anonymise sensitive personal information. In particular, do not turn private health, financial, employment, relationship or location discussions into public articles unless the owner explicitly requests it and approves the exact wording. Do not use saved profile context as article material unless the current request explicitly authorises it.

Never invent personal experience, metrics, results, customer stories, quotations, experiments or sources. Label estimates and assumptions. Distinguish the author's opinion from established facts. For time-sensitive or niche factual claims, verify reliable sources and include human-readable source links in the article.

Do not use a conversation as evidence that a claim is true. A ChatGPT answer in the conversation is a lead to verify, not a source.

## 4. Turn an approved article into a GitHub commit

Preferred file path:

    _posts/YYYY-MM-DD-short-descriptive-slug.md

Before creating the file, check whether an equivalent topic already exists in `_posts/`. Update an existing article only when explicitly asked; otherwise create a new, distinct article. Never overwrite a file merely because the filename collides.

After committing, report:
- exact file path and commit;
- Actions build/deployment status, if available;
- public article/site URL only after verifying that it is live;
- any remaining manual step.

## 5. Process historical chats

Use the companion private workflow documented in the private `research_drafts` repository under `chatgpt-blog-import/`. It extracts local Markdown transcripts from an official ChatGPT data export; it does not publish or upload transcripts.

Historical processing should happen in two passes:
1. **Discovery:** index conversations, group related chats into themes, score originality/usefulness/evidence, identify duplicates and exclude private or low-value threads.
2. **Editorial:** select one theme, combine only relevant conversations, verify claims, draft one article, review it and publish only after explicit approval.

A single article may synthesise several related conversations, but it must not imply that separate discussions happened as one event. Preserve chronology where it matters and omit irrelevant chat details.

## 6. Operating rule

The reliable routine is:

**Capture → Select → Draft → Verify → Approve → Commit → Verify deployment.**

Do not automate approval. Do not optimise for article count; publish only durable, useful work.
