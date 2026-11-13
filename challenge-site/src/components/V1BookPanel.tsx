"use client";

import Link from "next/link";
import {
  V1_COVER_SRC,
  V1_LAUNCH_REGISTER_URL,
  V1_PDF_HREF,
  V1_READ_ONLINE_HREF,
} from "@/lib/dp-v1-release";
import { useV1Phase } from "@/components/v1/V1PhaseText";

/**
 * Version 1.0 of the book. Before 10am PT on Nov 13: the launch and registration. During the launch (10–11am PT):
 * live, with the PDF. From 11am PT: released, no launch call to action. Switches on the clock without a reload.
 */
export default function V1BookPanel({
  heading = "h2",
}: {
  now?: Date;
  heading?: "h1" | "h2";
}) {
  const phase = useV1Phase();
  const released = phase !== "before";
  const H = heading;
  return (
    <section
      aria-labelledby="v1-book-heading"
      className="border-b-2 border-amber-400/60 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:flex-row sm:items-center sm:px-6 sm:py-12">
        <a href={V1_READ_ONLINE_HREF} className="shrink-0 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={V1_COVER_SRC}
            alt="Cover of The Desirable Properties of a Meta-Layer, Version 1.0"
            className="w-40 rounded-md shadow-2xl shadow-black/60 sm:w-48"
          />
        </a>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            {phase === "before"
              ? "Version 1.0 · releases Friday"
              : phase === "during"
                ? "Version 1.0 is live"
                : "Version 1.0 · released November 13, 2026"}
          </p>
          <H
            id="v1-book-heading"
            className="mt-2 text-3xl font-bold text-white sm:text-4xl"
          >
            The Desirable Properties of a Meta-Layer
          </H>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-200">
            {released ? (
              <>
                Twenty-four properties for the layered web, written in the open
                over two years. Read it online, with a discussion layer on every
                page, or download the PDF.
                {phase === "during"
                  ? " The launch gathering is live on Zoom now, until 11 AM PT."
                  : null}
              </>
            ) : (
              "Twenty-four properties for the layered web, written in the open over two years. V1.0 releases Friday, November 13, 2026, 10–11 AM PT, live on Zoom."
            )}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {released ? (
              <>
                <a
                  href={V1_PDF_HREF}
                  download
                  className="inline-flex rounded-lg border-2 border-amber-300 bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Download the PDF
                </a>
                <a
                  href={V1_READ_ONLINE_HREF}
                  className="inline-flex rounded-lg bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Read online →
                </a>
              </>
            ) : (
              <>
                <a
                  href={V1_LAUNCH_REGISTER_URL}
                  className="inline-flex rounded-lg border-2 border-amber-300 bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400"
                >
                  Join the launch: register free
                </a>
                <a
                  href={V1_READ_ONLINE_HREF}
                  className="inline-flex rounded-lg bg-slate-800 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
                >
                  Read the book online →
                </a>
              </>
            )}
            {heading === "h2" ? (
              <Link
                href="/v1"
                className="inline-flex items-center px-2 text-sm text-amber-200 hover:text-amber-100"
              >
                About Version 1.0 and the videos
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
