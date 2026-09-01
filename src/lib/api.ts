import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

export interface Post {
  slug: string;
  title: string;
  techStack: string[];
  summary: string;
  contentHtml: string;
  createdAt: Date;
}

const postsDirectory = path.join(process.cwd(), "_posts");

function parseFrontmatterDate(value: unknown, fallback: Date): Date {
  let dateStr: string | null = null;
  if (typeof value === "string") {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    dateStr = m ? m[1] : null;
  } else if (value instanceof Date && !Number.isNaN(value.getTime())) {
    dateStr = value.toISOString().slice(0, 10);
  }
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return fallback;
  const d = new Date(dateStr + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function getPosts(): Promise<Post[]> {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const posts = await Promise.all(
    fileNames.map(async (fileName): Promise<Post | null> => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const stats = fs.statSync(fullPath);

      if (!fileContents.trimStart().startsWith("---")) {
        console.warn(`[api] ${fileName}: missing Frontmatter delimiters "---", skipping`);
        return null;
      }

      let data: Record<string, unknown>;
      let content: string;
      try {
        const parsed = matter(fileContents);
        data = parsed.data as Record<string, unknown>;
        content = parsed.content;
      } catch (err) {
        console.warn(`[api] ${fileName}: Frontmatter parse error, skipping`, err);
        return null;
      }

      const title = typeof data.title === "string" ? data.title.trim() : "";
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      const rawDate = data.date;
      const techStack = Array.isArray(data.techStack)
        ? data.techStack.filter((item: unknown): item is string => typeof item === "string")
        : [];

      if (!title || !summary || techStack.length === 0) {
        console.warn(
          `[api] ${fileName}: missing required Frontmatter fields (title, techStack, summary), skipping`
        );
        return null;
      }

      const createdAt = parseFrontmatterDate(rawDate, stats.birthtime);

      const processedContent = await remark().use(html).process(content);

      return {
        slug: fileName.replace(/\.md$/, ""),
        title,
        techStack,
        summary,
        contentHtml: processedContent.toString(),
        createdAt,
      };
    })
  );

  return (posts.filter(Boolean) as Post[]).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}
