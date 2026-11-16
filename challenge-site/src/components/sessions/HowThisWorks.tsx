/** Frame for the occurrence page: what lives here and who decides what. */
export default function HowThisWorks() {
  return (
    <section aria-labelledby="how-heading" className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 sm:px-5">
      <h2 id="how-heading" className="text-lg font-semibold text-white">How this works</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-base text-slate-300">
        <li>Claude drafted the summary and the draft ballot from the meeting transcript.</li>
        <li>Participants correct the record during a 24-hour review.</li>
        <li>The council decides what goes to a vote.</li>
        <li>Eligible community members decide.</li>
      </ul>
      <p className="mt-3 font-semibold text-white">Nothing is decided yet.</p>
    </section>
  );
}
