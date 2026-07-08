"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** App-styled markdown renderer for notes. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: (p) => <h1 className="mb-2 mt-4 text-lg font-bold text-ink first:mt-0" {...p} />,
        h2: (p) => <h2 className="mb-2 mt-4 text-base font-bold text-ink first:mt-0" {...p} />,
        h3: (p) => <h3 className="mb-1.5 mt-3 text-sm font-bold text-ink first:mt-0" {...p} />,
        p: (p) => <p className="mb-2 text-sm leading-relaxed text-ink" {...p} />,
        ul: (p) => <ul className="mb-2 list-disc space-y-0.5 pl-5 text-sm text-ink" {...p} />,
        ol: (p) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 text-sm text-ink" {...p} />,
        li: (p) => <li className="leading-relaxed" {...p} />,
        a: (p) => (
          <a
            className="text-brand-600 underline underline-offset-2 hover:text-brand-700"
            target="_blank"
            rel="noreferrer"
            {...p}
          />
        ),
        blockquote: (p) => (
          <blockquote className="mb-2 border-l-2 border-brand-300 pl-3 text-sm italic text-muted" {...p} />
        ),
        code: (p) => (
          <code className="rounded bg-sand px-1 py-0.5 font-mono text-xs text-ink" {...p} />
        ),
        pre: (p) => (
          <pre className="mb-2 overflow-x-auto rounded-lg bg-sand p-3 [&_code]:bg-transparent [&_code]:p-0" {...p} />
        ),
        hr: () => <hr className="my-4 border-line" />,
        table: (p) => (
          <div className="mb-2 overflow-x-auto">
            <table className="w-full border-collapse text-sm" {...p} />
          </div>
        ),
        th: (p) => <th className="border border-line bg-sand px-2 py-1 text-left font-semibold" {...p} />,
        td: (p) => <td className="border border-line px-2 py-1" {...p} />,
        input: (p) => <input className="mr-1.5 accent-brand-600" {...p} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
