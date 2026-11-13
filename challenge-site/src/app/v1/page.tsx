import type { Metadata } from "next";
import LayeredWebVideoCarousel from "@/components/LayeredWebVideoCarousel";
import V1BookPanel from "@/components/V1BookPanel";
import AskDeepiPanel from "@/components/v1/AskDeepiPanel";
import { layeredWebVideosAt } from "@/data/layered-web-videos";
import V1GetBook from "@/components/v1/V1GetBook";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Version 1.0 | Desirable Properties",
  description:
    "The Desirable Properties of a Meta-Layer, Version 1.0: read it online or download the PDF.",
};

export default function V1Page() {
  const now = new Date();
  return (
    <main>
      <V1BookPanel heading="h1" />

      <section className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-white">The Layered Web</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Short videos on why the web needs a layer above the page, and what
            the 24 properties are for.
          </p>
          <div className="mt-6">
            <LayeredWebVideoCarousel videos={layeredWebVideosAt(now)} />
          </div>
        </div>
      </section>

      <AskDeepiPanel />

      <V1GetBook />
    </main>
  );
}
