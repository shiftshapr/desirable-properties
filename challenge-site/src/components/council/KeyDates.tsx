import LocalTime, { ZoneNote } from "@/components/council/LocalTime";
import type { ElectionDetail, ElectionSummary } from "@/lib/council";

type Dates = Pick<
  ElectionSummary,
  | "nominations_open_at"
  | "nominations_close_at"
  | "voting_open_at"
  | "voting_close_at"
  | "results_published_at"
> &
  Partial<Pick<ElectionDetail, "announced_at">>;

/** The election's key dates, each in the visitor's time zone and in Pacific time. */
export default function KeyDates({ election }: { election: Dates }) {
  const rows: [string, string | null | undefined][] = [
    ["Announced", election.announced_at],
    ["Nominations open", election.nominations_open_at],
    ["Nominations close", election.nominations_close_at],
    ["Voting opens", election.voting_open_at],
    ["Voting closes", election.voting_close_at],
    ["Results published", election.results_published_at],
  ];
  return (
    <div>
      <ZoneNote />
      <dl className="mt-1 divide-y divide-slate-800 text-sm">
        {rows
          .filter(([, iso]) => Boolean(iso))
          .map(([label, iso]) => (
            <div
              key={label}
              className="flex flex-col gap-1 py-2.5 sm:flex-row sm:gap-4"
            >
              <dt className="w-40 shrink-0 text-slate-400">{label}</dt>
              <dd className="min-w-0">
                <LocalTime iso={iso as string} />
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
