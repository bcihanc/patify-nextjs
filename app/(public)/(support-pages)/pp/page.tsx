import fs from "node:fs/promises";
import path from "node:path";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata = {
  title: "Privacy Policy / Gizlilik Politikası | Patify",
  description:
    "Patify Privacy Policy (KVKK + GDPR). Turkish and English versions.",
};

async function loadContent(filename: string): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "app",
    "(public)",
    "(support-pages)",
    "_content",
    filename,
  );
  return fs.readFile(filePath, "utf-8");
}

export default async function PrivacyPolicyPage() {
  const [tr, en] = await Promise.all([
    loadContent("privacy_policy_tr.md"),
    loadContent("privacy_policy_en.md"),
  ]);

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <nav className="mb-8 flex gap-4 text-sm border-b border-foreground/10 pb-4">
        <a href="#tr" className="font-semibold hover:underline">
          🇹🇷 Türkçe
        </a>
        <span className="text-foreground/30">·</span>
        <a href="#en" className="font-semibold hover:underline">
          🇬🇧 English
        </a>
      </nav>

      <article
        id="tr"
        className="prose prose-zinc dark:prose-invert max-w-none"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{tr}</ReactMarkdown>
      </article>

      <hr className="my-16 border-foreground/10" />

      <article
        id="en"
        className="prose prose-zinc dark:prose-invert max-w-none"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{en}</ReactMarkdown>
      </article>
    </main>
  );
}
