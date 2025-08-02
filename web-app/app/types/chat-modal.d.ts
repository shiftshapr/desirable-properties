export interface ParsedSubmissionData {
  title: string;
  overview: string;
  addressedDPs: Array<{
    dp: string;
    summary: string;
  }>;
  clarifications: Array<{
    dp: string;
    type: 'Clarification' | 'Extension';
    title: string;
    content: string;
    whyItMatters: string;
  }>;
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySubmission?: (data: ParsedSubmissionData) => void;
} 