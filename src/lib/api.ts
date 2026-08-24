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

export async function getPosts(): Promise<Post[]> {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const posts = await Promise.all(
    fileNames.map(async (fileName): Promise<Post> => {
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data, content } = matter(fileContents);
      const processedContent = await remark().use(html).process(content);
      const stats = fs.statSync(fullPath);

      return {
        slug: fileName.replace(/\.md$/, ""),
        title: typeof data.title === "string" ? data.title : "",
        techStack: Array.isArray(data.techStack)
          ? data.techStack.filter(
              (item: unknown): item is string => typeof item === "string"
            )
          : [],
        summary: typeof data.summary === "string" ? data.summary : "",
        contentHtml: processedContent.toString(),
        createdAt: stats.birthtime,
      };
    })
  );

  return posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
