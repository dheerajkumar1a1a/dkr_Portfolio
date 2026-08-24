import AdminPortal from "@/components/AdminPortal";
import { getPosts } from "@/lib/api";

export default async function Home() {
  const posts = await getPosts();

  return (
    <main
      className="min-h-screen bg-bgBase px-6 py-20"
      style={{
        backgroundImage:
          "radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.05), transparent 25%), radial-gradient(circle at 85% 30%, rgba(147, 51, 234, 0.05), transparent 25%)",
      }}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-16 text-center">
          <h1 className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
            Dheeraj Kumar
          </h1>
          <p className="mt-2 text-lg font-light text-zinc-400">
            Data Science &amp; Automation Engineer
          </p>
        </header>

        <section className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {posts.length === 0 && (
            <article className="rounded-2xl border border-dashed border-cardBorder bg-cardBg p-8 text-center backdrop-blur-md">
              <h2 className="text-lg font-medium text-zinc-400">Awaiting Data</h2>
              <p className="mt-3 text-sm text-zinc-500">
                Use the secure pipeline (Ctrl+Shift+A) to deploy your first project.
              </p>
            </article>
          )}

          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-2xl border border-cardBorder bg-cardBg p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.15)]"
            >
              <h2 className="text-xl font-medium tracking-tight">{post.title}</h2>
              <div className="mt-3">
                <span className="inline-block rounded-md border border-accent/20 bg-accent/10 px-3 py-1.5 font-mono text-xs text-blue-400">
                  {post.techStack.join(" • ")}
                </span>
              </div>
              <p className="mb-6 mt-3 text-sm leading-relaxed text-zinc-400">
                {post.summary}
              </p>
              <hr className="mb-6 border-cardBorder" />
              <div
                className="markdown-body text-sm leading-relaxed text-zinc-300"
                dangerouslySetInnerHTML={{ __html: post.contentHtml }}
              />
            </article>
          ))}
        </section>

        <AdminPortal />
      </div>
    </main>
  );
}
