'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { Trophy, User } from 'lucide-react';
import ChatModal from '../../components/ChatModal';
import { isFeatureEnabled } from '../../lib/features';

interface SubmissionForm {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  overview: string;
  rawContent: string;
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

export default function SubmitPage() {
  const { user, login, logout, authenticated, ready } = usePrivy();
  const [formData, setFormData] = useState<SubmissionForm>({
    firstName: '',
    lastName: '',
    email: '',
    title: '',
    overview: '',
    rawContent: '',
    addressedDPs: [],
    clarifications: []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    success: boolean;
    message: string;
    submissionNumber?: number;
  } | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Function to handle copying submission data from chat
  const handleCopySubmission = (data: {
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
  }) => {
    setFormData(prev => ({
      ...prev,
      title: data.title,
      overview: data.overview,
      addressedDPs: data.addressedDPs,
      clarifications: data.clarifications
    }));
    
    // Close the chat modal
    setIsChatOpen(false);
    
    // Show a success message
    setSubmissionResult({
      success: true,
      message: 'Submission data copied from AI assistant! You can now review and submit.'
    });
  };

  const desirableProperties = [
    'DP1 - Federated Authentication & Accountability',
    'DP2 - Participant Agency and Empowerment',
    'DP3 - Adaptive Governance Supporting an Exponentially Growing Community',
    'DP4 - Data Sovereignty and Privacy',
    'DP5 - Decentralized Namespace',
    'DP6 - Commerce',
    'DP7 - Simplicity and Interoperability',
    'DP8 - Collaborative Environment and Meta-Communities',
    'DP9 - Developer and Community Incentives',
    'DP10 - Education',
    'DP11 - Safe and Ethical AI',
    'DP12 - Community-based AI Governance',
    'DP13 - AI Containment',
    'DP14 - Trust and Transparency',
    'DP15 - Security and Provenance',
    'DP16 - Roadmap and Milestones',
    'DP17 - Financial Sustainability',
    'DP18 - Feedback Loops and Reputation',
    'DP19 - Amplifying Presence and Community Engagement',
    'DP20 - Community Ownership',
    'DP21 - Multi-modal'
  ];

  const handleDPToggle = (dp: string) => {
    setFormData(prev => ({
      ...prev,
      addressedDPs: prev.addressedDPs.some(d => d.dp === dp)
        ? prev.addressedDPs.filter(d => d.dp !== dp)
        : [...prev.addressedDPs, { dp, summary: '' }]
    }));
  };

  const addClarification = () => {
    setFormData(prev => ({
      ...prev,
      clarifications: [...prev.clarifications, {
        dp: '',
        type: 'Extension',
        title: '',
        content: '',
        whyItMatters: ''
      }]
    }));
  };

  const updateClarification = (index: number, field: keyof typeof formData.clarifications[0], value: string) => {
    setFormData(prev => ({
      ...prev,
      clarifications: prev.clarifications.map((clar, i) =>
        i === index ? { ...clar, [field]: value } : clar
      )
    }));
  };

  const removeClarification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      clarifications: prev.clarifications.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      // Format the submission data
      const submissionData = {
        submitter: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email
        },
        submission: {
          title: formData.title,
          overview: formData.overview,
          source_link: null,
          raw_content: formData.rawContent
        },
        directly_addressed_dps: formData.addressedDPs.map(dp => ({
          dp: dp.dp,
          summary: dp.summary || `This submission addresses ${dp.dp}`
        })),
        clarifications_and_extensions: formData.clarifications.map(clar => ({
          dp: clar.dp,
          type: clar.type,
          title: clar.title,
          [clar.type.toLowerCase()]: clar.content,
          why_it_matters: clar.whyItMatters
        }))
      };

      // Send to API
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmissionResult({
          success: true,
          message: 'Submission created successfully!',
          submissionNumber: result.submissionNumber
        });
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          title: '',
          overview: '',
          rawContent: '',
          addressedDPs: [],
          clarifications: []
        });
      } else {
        setSubmissionResult({
          success: false,
          message: result.error || 'Failed to create submission'
        });
      }
    } catch {
      setSubmissionResult({
        success: false,
        message: 'An error occurred while submitting'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo on the left */}
            <Link href="/" className="flex items-center">
              <img 
                src="/mli_logo_white.png" 
                alt="Meta-Layer Initiative" 
                className="h-6 w-auto"
              />
            </Link>
            
            {/* Navigation items on the right */}
            <div className="flex items-center gap-4">
              {ready && (
                <>
                  <Link 
                    href="/leaderboard" 
                    className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm hidden sm:inline">Leaderboard</span>
                  </Link>
                  {authenticated ? (
                    <>
                      <Link 
                        href="/profile" 
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm hidden sm:inline">
                          {user?.email?.address || user?.wallet?.address || 'Profile'}
                        </span>
                      </Link>
                      <button
                        onClick={logout}
                        className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={login}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Sign In
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Submit to Meta-Layer Initiative
            </h1>
            <p className="text-lg text-gray-600">
              Share your ideas, critiques, or proposals for the Meta-Layer ecosystem
            </p>
            
            {/* Chat Assistant Button */}
            {isFeatureEnabled('CHAT_ASSISTANT') && (
              <div className="mt-4">
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Need Help? Ask the Assistant
                </button>
              </div>
            )}
          </div>

          {/* Submission Result */}
          {submissionResult && (
            <div className={`mb-6 p-4 rounded-lg ${
              submissionResult.success 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              <p className="font-medium">{submissionResult.message}</p>
              {submissionResult.submissionNumber && (
                <p className="text-sm mt-1">Submission #{submissionResult.submissionNumber}</p>
              )}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submission Details */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Submission Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief, descriptive title for your submission"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Overview *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.overview}
                    onChange={(e) => setFormData(prev => ({ ...prev, overview: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief overview of your submission (2-3 sentences)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Content *
                  </label>
                  <textarea
                    required
                    rows={8}
                    value={formData.rawContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, rawContent: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Detailed description of your idea, critique, or proposal..."
                  />
                </div>
              </div>
            </div>

            {/* Desirable Properties */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Desirable Properties Addressed *
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Select all Desirable Properties that your submission addresses:
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {desirableProperties.map((dp) => (
                    <label key={dp} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.addressedDPs.some(d => d.dp === dp)}
                        onChange={() => handleDPToggle(dp)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{dp}</span>
                    </label>
                  ))}
                </div>
                
                {/* Summary inputs for selected DPs */}
                {formData.addressedDPs.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Summary for Each Selected Desirable Property
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Please provide a brief summary of how your submission addresses each selected Desirable Property:
                    </p>
                    <div className="space-y-4">
                      {formData.addressedDPs.map((dpItem, index) => (
                        <div key={dpItem.dp} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {dpItem.dp}
                          </label>
                          <textarea
                            rows={2}
                            value={dpItem.summary}
                            onChange={(e) => {
                              setFormData(prev => ({
                                ...prev,
                                addressedDPs: prev.addressedDPs.map((item, i) =>
                                  i === index ? { ...item, summary: e.target.value } : item
                                )
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Briefly explain how your submission addresses ${dpItem.dp}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Clarifications and Extensions */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Clarifications and Extensions (Optional)
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Add any clarifications or extensions to specific Desirable Properties:
              </p>
              
              {formData.clarifications.map((clar, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Clarification/Extension #{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeClarification(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Desirable Property
                      </label>
                      <select
                        value={clar.dp}
                        onChange={(e) => updateClarification(index, 'dp', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select a DP</option>
                        {desirableProperties.map((dp) => (
                          <option key={dp} value={dp}>{dp}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type
                      </label>
                      <select
                        value={clar.type}
                        onChange={(e) => updateClarification(index, 'type', e.target.value as 'Clarification' | 'Extension')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Extension">Extension</option>
                        <option value="Clarification">Clarification</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={clar.title}
                      onChange={(e) => updateClarification(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Brief title for this clarification/extension"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      rows={3}
                      value={clar.content}
                      onChange={(e) => updateClarification(index, 'content', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Detailed explanation of this clarification or extension..."
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Why It Matters
                    </label>
                    <textarea
                      rows={2}
                      value={clar.whyItMatters}
                      onChange={(e) => updateClarification(index, 'whyItMatters', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Why is this clarification or extension important?"
                    />
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addClarification}
                className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                + Add Clarification/Extension
              </button>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isSubmitting || formData.addressedDPs.length === 0}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Submission...' : 'Submit to Meta-Layer Initiative'}
              </button>
              {formData.addressedDPs.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Please select at least one Desirable Property that your submission addresses.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Chat Modal */}
      {isFeatureEnabled('CHAT_ASSISTANT') && (
        <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
} 