import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDir = path.join(process.cwd(), "_posts");

if (!fs.existsSync(postsDir)) {
  console.log("[validate-posts] _posts/ not found — nothing to validate");
  process.exit(0);
}

const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
let failed = false;

const requiredFields = ["title", "date", "techStack", "summary"];

for (const file of files) {
  const fullPath = path.join(postsDir, file);
  const raw = fs.readFileSync(fullPath, "utf8");

  if (!raw.trimStart().startsWith("---")) {
    console.error(`[validate-posts] FAIL ${file}: missing opening --- Frontmatter delimiter`);
    failed = true;
    continue;
  }

  let data;
  try {
    data = matter(raw).data;
  } catch (e) {
    console.error(`[validate-posts] FAIL ${file}: Frontmatter YAML parse error — ${e.message}`);
    failed = true;
    continue;
  }

  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`[validate-posts] FAIL ${file}: missing required Frontmatter field "${field}"`);
      failed = true;
    }
  }

  if ("title" in data && typeof data.title !== "string") {
    console.error(`[validate-posts] FAIL ${file}: title must be string`);
    failed = true;
  }
  if ("summary" in data && typeof data.summary !== "string") {
    console.error(`[validate-posts] FAIL ${file}: summary must be string`);
    failed = true;
  }
  if ("date" in data) {
    let dateStr = null;
    if (typeof data.date === "string") {
      // Handle ISO datetime like "2024-06-23T00:00:00.000Z" → trim to YYYY-MM-DD
      const m = data.date.match(/^(\d{4}-\d{2}-\d{2})/);
      dateStr = m ? m[1] : null;
    } else if (data.date instanceof Date && !Number.isNaN(data.date.getTime())) {
      dateStr = data.date.toISOString().slice(0, 10);
    }
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error(`[validate-posts] FAIL ${file}: date must be YYYY-MM-DD string (got ${JSON.stringify(data.date)})`);
      failed = true;
    } else {
      const d = new Date(dateStr + "T00:00:00Z");
      if (Number.isNaN(d.getTime())) {
        console.error(`[validate-posts] FAIL ${file}: date is not a valid calendar date`);
        failed = true;
      }
    }
  }
  if ("techStack" in data) {
    if (!Array.isArray(data.techStack) || data.techStack.length === 0 || !data.techStack.every((v) => typeof v === "string")) {
      console.error(`[validate-posts] FAIL ${file}: techStack must be non-empty string[]`);
      failed = true;
    }
  }
  if (!failed) {
    console.log(`[validate-posts] OK ${file}`);
  }
}

if (files.length === 0) {
  console.log("[validate-posts] no .md files in _posts/");
}

if (failed) {
  console.error("[validate-posts] validation failed");
  process.exit(1);
} else {
  console.log(`[validate-posts] ${files.length} file(s) validated`);
}
