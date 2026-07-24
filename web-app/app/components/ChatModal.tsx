'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageCircle, Copy, Check, Paperclip } from 'lucide-react';
import {
  HERMES_DOC_ACCEPT,
  HERMES_DOC_MAX_COUNT,
  type PendingHermesDocument,
  readHermesDocument,
  toDocumentPayload,
} from '../../lib/hermesDocuments';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  submissionData?: ParsedSubmissionData;
  attachments?: string[];
}

interface ParsedSubmissionData {
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

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopySubmission?: (data: ParsedSubmissionData) => void;
}

// Function to parse submission data from AI response
function parseSubmissionData(text: string): ParsedSubmissionData | null {
  try {
    console.log('🔍 [Parse] Attempting to parse submission data...');
    console.log('🔍 [Parse] Text length:', text.length);
    console.log('🔍 [Parse] Text preview:', text.substring(0, 200) + '...');
    
    // Check if this looks like a complete submission with v1.5 protocol
    const hasV15Footer = text.includes('This submission was generated with protocol META-DP-EVAL-v1.5');
    const hasTitle = text.includes('**Title:**');
    const hasOverview = text.includes('**Contribution Overview:**');
    const hasDPs = text.includes('**Directly Addressed Desirable Properties:**');
    
    console.log('🔍 [Parse] Has v1.5 footer:', hasV15Footer);
    console.log('🔍 [Parse] Has title:', hasTitle);
    console.log('🔍 [Parse] Has overview:', hasOverview);
    console.log('🔍 [Parse] Has DPs:', hasDPs);
    
    // More flexible detection - check for v1.5 footer OR standard structure
    if (!hasV15Footer && (!hasTitle || !hasOverview || !hasDPs)) {
      console.log('❌ [Parse] Not a valid submission - missing required elements');
      return null;
    }

    // Extract title - more flexible regex
    const titleMatch = text.match(/\*\*Title:\*\*\s*(.+?)(?=\n|$)/);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract overview - more flexible regex
    const overviewMatch = text.match(/\*\*Contribution Overview:\*\*[ \t\n\r]*([^]*?)(?=\n\*\*Directly Addressed Desirable Properties:\*\*|\n\*\*Clarifications|\\(End of Submission\\))/);
    const overview = overviewMatch ? overviewMatch[1].trim() : '';

    // Extract addressed DPs - more flexible parsing
    const dpsSection = text.match(/\*\*Directly Addressed Desirable Properties:\*\*[ \t\n\r]*([^]*?)(?=\n\*\*Clarifications|\\(End of Submission\\)|$)/);
    const addressedDPs: Array<{ dp: string; summary: string }> = [];
    
    if (dpsSection) {
      // Look for DP lines with various formats
      const dpLines = dpsSection[1].split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.startsWith('- DP') || trimmed.startsWith('DP') || trimmed.match(/DP\d+/);
      });
      
      dpLines.forEach(line => {
        // More flexible DP matching
        const dpMatch = line.match(/(?:-)?\s*(DP\d+[^:]*):\s*(.+)/);
        if (dpMatch) {
          addressedDPs.push({
            dp: dpMatch[1].trim(),
            summary: dpMatch[2].trim()
          });
        }
      });
    }

    // Extract clarifications and extensions - more flexible
    const clarificationsSection = text.match(/\*\*Clarifications & Extensions \(optional\):\*\*[ \t\n\r]*([^]*?)(?=\\(End of Submission\\)|$)/);
    const clarifications: Array<{
      dp: string;
      type: 'Clarification' | 'Extension';
      title: string;
      content: string;
      whyItMatters: string;
    }> = [];

    if (clarificationsSection) {
      const clarBlocks = clarificationsSection[1].split(/(?=DP#)/).filter(block => block.trim());
      clarBlocks.forEach(block => {
        const dpMatch = block.match(/DP#[ \t\n\r]*–[ \t\n\r]*([^:]+):[ \t\n\r]*(.+)/);
        const typeMatch = block.match(/(Clarification|Extension):[ \t\n\r]*([^]*?)(\nWhy it matters:|$)/);
        const whyMatch = block.match(/Why it matters:[ \t\n\r]*([^]*?)(\n|$)/);

        if (dpMatch && typeMatch) {
          clarifications.push({
            dp: dpMatch[1].trim(),
            type: typeMatch[1] as 'Clarification' | 'Extension',
            title: typeMatch[2].trim(),
            content: typeMatch[2].trim(),
            whyItMatters: whyMatch ? whyMatch[1].trim() : ''
          });
        }
      });
    }

    // Return data if we have at least a title and overview, OR if it has v1.5 footer
    if ((title && overview) || hasV15Footer) {
      console.log('✅ [Parse] Successfully parsed submission data');
      return {
        title: title || 'Generated Submission',
        overview: overview || 'AI-generated submission following v1.5 protocol',
        addressedDPs,
        clarifications
      };
    }

    console.log('❌ [Parse] Missing required title or overview');
    return null;
  } catch (error) {
    console.error('❌ [Parse] Error parsing submission data:', error);
    return null;
  }
}

export default function ChatModal({ isOpen, onClose, onCopySubmission }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: "I'm Hermes. I work with the community to make the Desirable Properties as coherent and impactful as possible — clarifying tensions, connecting ideas to Gov Hub proposals, and helping shape stronger contributions. You can upload .txt, .md, .pdf, or .docx files for review. What would you like to explore?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachments, setAttachments] = useState<PendingHermesDocument[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;
    setAttachError(null);
    const next = [...attachments];
    for (const file of Array.from(files)) {
      if (next.length >= HERMES_DOC_MAX_COUNT) {
        setAttachError(`Maximum ${HERMES_DOC_MAX_COUNT} documents per message`);
        break;
      }
      try {
        next.push(await readHermesDocument(file));
      } catch (err) {
        setAttachError(err instanceof Error ? err.message : 'Could not read file');
      }
    }
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    const text = inputMessage.trim();
    if ((!text && attachments.length === 0) || isLoading) return;

    const attachmentNames = attachments.map((doc) => doc.name);
    const displayText = text || `Uploaded ${attachmentNames.join(', ')} for review`;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: displayText,
      sender: 'user',
      timestamp: new Date(),
      attachments: attachmentNames.length ? attachmentNames : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    const docsToSend = attachments;
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          documents: toDocumentPayload(docsToSend),
          history: Array.isArray(messages) ? messages.map(msg => ({
            text: msg.text,
            sender: msg.sender
          })) : []
        }),
      });

      const data = await response.json();
      console.log('🔍 [ChatModal] Received response:', data);
      console.log('🔍 [ChatModal] Response text length:', data.response?.length || 0);

      if (response.ok) {
        // Parse submission data from the response
        console.log('🔍 [ChatModal] Attempting to parse submission data...');
        const submissionData = parseSubmissionData(data.response);
        console.log('🔍 [ChatModal] Parse result:', submissionData ? 'SUCCESS' : 'FAILED');
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'assistant',
          timestamp: new Date(),
          submissionData: submissionData || undefined
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.error || 'Sorry, I encountered an error. Please try again.',
          sender: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCopySubmission = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.submissionData && onCopySubmission) {
      onCopySubmission(message.submissionData);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Hermes — Desirable Properties
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Array.isArray(messages) ? messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.attachments?.length ? (
                  <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    Attached: {message.attachments.join(', ')}
                  </p>
                ) : null}
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
                
                {/* Copy to Submission Form Button */}
                {message.sender === 'assistant' && message.submissionData && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => handleCopySubmission(message.id)}
                      className="flex items-center gap-2 text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy to Submission Form
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )) : null}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          {attachments.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-2">
              {attachments.map((doc) => (
                <li key={doc.id} className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  <span className="max-w-[180px] truncate">{doc.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((d) => d.id !== doc.id))}
                    className="text-gray-400 hover:text-gray-700"
                    aria-label={`Remove ${doc.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {attachError ? <p className="mb-2 text-xs text-red-600">{attachError}</p> : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={HERMES_DOC_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => onFilesSelected(e.target.files)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachments.length >= HERMES_DOC_MAX_COUNT}
              className="border border-gray-300 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              title="Upload .txt, .md, .pdf, or .docx"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Hermes about Desirable Properties, tensions between DPs, or upload a draft for review…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={(!inputMessage.trim() && attachments.length === 0) || isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 