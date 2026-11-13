"use client";

import {
  V1_LAUNCH_LABEL,
  V1_LAUNCH_REGISTER_URL,
  V1_PDF_HREF,
  V1_READ_ONLINE_HREF,
} from "@/lib/dp-v1-release";
import { useV1Phase } from "@/components/v1/V1PhaseText";

/** /v1: the launch and registration before 10am PT on Nov 13; from then on, how to get the book. */
export default function V1GetBook() {
  const released = useV1Phase() !== "before";
  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-white">
          {released ? "Get the book" : "The launch"}
        </h2>
        <ul className="mt-4 max-w-2xl list-disc space-y-2 pl-5 text-slate-300">
          {released ? (
            <>
              <li>
                <a
                  href={V1_PDF_HREF}
                  download
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Download the PDF
                </a>{" "}
                to read offline or print.
              </li>
              <li>
                <a
                  href={V1_READ_ONLINE_HREF}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Read it online
                </a>
                , where every page has a discussion layer for questions and
                proposals toward Version 1.1.
              </li>
            </>
          ) : (
            <>
              <li>
                {V1_LAUNCH_LABEL}.{" "}
                <a
                  href={V1_LAUNCH_REGISTER_URL}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Register free
                </a>
                .
              </li>
              <li>The PDF is available here from the start of the launch.</li>
              <li>
                Until then,{" "}
                <a
                  href={V1_READ_ONLINE_HREF}
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  read the book online
                </a>
                .
              </li>
            </>
          )}
        </ul>
      </div>
    </section>
  );
}
