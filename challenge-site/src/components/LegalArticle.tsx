export default function LegalArticle({ html }: { html: string }) {
  return (
    <div
      className="legal-article space-y-4 text-base leading-relaxed text-slate-300 [&_a]:text-cyan-300 [&_a:hover]:text-cyan-200 [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-white [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_strong]:text-white [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-slate-700 [&_th]:py-2 [&_th]:text-left [&_th]:text-slate-200 [&_td]:border-b [&_td]:border-slate-800 [&_td]:py-2 [&_td]:align-top [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
