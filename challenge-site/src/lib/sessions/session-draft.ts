/** Shape of src/data/sessions/<date>-draft.json (built from the meeting digest by build_draft.py in the owner's handoff). */
export type DraftLabel = 'Participant proposal' | 'Proposal added after the meeting' | null;

export type SessionDraft = {
  source: { file: string; sha256: string; note: string };
  decisions: Array<{
    n: number;
    title: string;
    options: Array<{ text: string; label: DraftLabel; note?: boolean }>;
    raisedBy: string | null;
  }>;
  ballot: {
    header: string;
    questions: Array<{
      n: number;
      context: string;
      question: string;
      options: string[];
      label: DraftLabel;
      /** A dated note, shown under the context, when the host corrected the context after the review. Optional. */
      correction?: string;
    }>;
  };
  /** A proposal made after the meeting (16 Nov: the interim council). Optional. */
  interimProposal?: { title: string; by: string; text: string };
  /** The process text with suggested changes marked. Optional. */
  processText?: { intro: string; body: string };
  /** Notes for the host while the draft is pending approval. Shown only in the staging preview. */
  hostNotes?: string[];
};
