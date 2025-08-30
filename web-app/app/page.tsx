'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ExternalLink, Users, FileText, X, User, MessageCircle, Trophy, Lightbulb, HelpCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useAuth } from '../lib/auth';
import Link from 'next/link';

import UnifiedVotingDisplay from './components/UnifiedVotingDisplay';
import CommentSection from './components/CommentSection';
import ChatModal from './components/ChatModal';
import { UnifiedElement, SubmissionElement, CommentElement, ReactionElement } from './components/UnifiedElement';

interface DesirableProperty {
  id: string;
  name: string;
  category: string;
  description: string;
  elements: Array<{
    name: string;
    description: string;
  }>;
  landing_title?: string;
  landing_subtitle?: string;
  landing_text?: string;
}

interface ApiResponse {
  meta: {
    title: string;
    description: string;
    version: string;
    total_properties: number;
    categories: string[];
  };
  desirable_properties: DesirableProperty[];
}

interface Submission {
  id: string;
  title: string;
  overview: string;
  sourceLink: string | null;
  submitter: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  };
  directlyAddressedDPs: Array<{
    dp: string;
    summary: string;
  }>;
  clarificationsExtensions: Array<{
    dp: string;
    type: string;
    title: string;
    content: string;
    whyItMatters: string;
  }>;
  upvotes: number;
  downvotes: number;
}

type TabType = 'summary' | 'properties' | 'submissions' | 'categories';

// Modal component
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative border border-gray-700">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function DesirablePropertiesApp() {
  const { user, login, logout, isAuthenticated: authenticated, isReady: ready, getAccessToken } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [expandedSubmissions, setExpandedSubmissions] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [dpDetail, setDpDetail] = useState<DesirableProperty | null>(null);
  const [submissionDetail, setSubmissionDetail] = useState<Submission | null>(null);
  const [visibleComments, setVisibleComments] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  // console.log('🔍 [Page] Component rendered, chatModalOpen:', chatModalOpen);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [voteCounts, setVoteCounts] = useState<Record<string, { upvotes: number; downvotes: number; userVote?: 'UP' | 'DOWN' | null }>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  // Function to handle copying submission data from chat to submit page
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
    console.log('🔍 [Page] handleCopySubmission called with data:', data);
    // Navigate to submit page with pre-filled data
    const submitUrl = new URL('/submit', window.location.origin);
    submitUrl.searchParams.set('title', data.title);
    submitUrl.searchParams.set('overview', data.overview);
    submitUrl.searchParams.set('addressedDPs', JSON.stringify(data.addressedDPs));
    submitUrl.searchParams.set('clarifications', JSON.stringify(data.clarifications));
    const finalUrl = submitUrl.toString();
    console.log('🔍 [Page] Navigating to:', finalUrl);
    window.location.href = finalUrl;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch desirable properties data
        const propertiesResponse = await fetch(`/api/desirable-properties?t=${Date.now()}`);
        if (!propertiesResponse.ok) {
          throw new Error('Failed to fetch desirable properties');
        }
        const propertiesData: ApiResponse = await propertiesResponse.json();
            // console.log('Loaded properties:', propertiesData.desirable_properties.length);
    // console.log('Sample property:', propertiesData.desirable_properties[0]);
    // console.log('Sample property landing fields:', {
    //   landing_title: propertiesData.desirable_properties[0]?.landing_title,
    //   landing_subtitle: propertiesData.desirable_properties[0]?.landing_subtitle,
    //   landing_text: propertiesData.desirable_properties[0]?.landing_text
    // });
        setData(propertiesData);
        
        // Fetch submissions data
        const submissionsResponse = await fetch(`/api/submissions?t=${Date.now()}`);
        if (!submissionsResponse.ok) {
          throw new Error('Failed to fetch submissions');
        }
        const submissionsData: { submissions: Submission[] } = await submissionsResponse.json();
        // console.log('Loaded submissions:', submissionsData.submissions?.length);
        const submissionsList = submissionsData.submissions || [];
        setSubmissions(submissionsList);
        // Pre-fetch all comment and vote counts for all submissions
        fetchAllSubmissionCounts(submissionsList);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Fetch and display build version
    setTimeout(() => {
      fetch(`/api/version?t=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
          const buildElement = document.getElementById('build-version');
          if (buildElement && data.build) {
            buildElement.textContent = data.build;
          }
        })
        .catch(error => {
          console.error('Failed to fetch version:', error);
          const buildElement = document.getElementById('build-version');
          if (buildElement) {
            buildElement.textContent = 'Unknown';
          }
        });
    }, 1000); // Wait 1 second for DOM to be ready
  }, []);

  // Re-fetch counts when submissions tab is activated
  useEffect(() => {
    if (activeTab === 'submissions' && submissions.length > 0) {
      // Re-fetch all counts when submissions tab is activated
      fetchAllSubmissionCounts(submissions);
    }
  }, [activeTab, submissions]);

  // Handle hash and URL parameter navigation
  useEffect(() => {
    const handleHashAndParams = () => {
      if (!data) return; // Wait for data to load

      const hash = window.location.hash;
      const urlParams = new URLSearchParams(window.location.search);
      
      // console.log('Hash:', hash, 'URL params:', urlParams.toString());

      // Check for hash-based navigation (#dp3, #dp15, etc.)
      if (hash && hash.startsWith('#dp')) {
        const dpId = hash.substring(1).toUpperCase(); // Remove # and convert to uppercase
        // console.log('Looking for DP from hash:', dpId);
        
        const dp = getDPByIdOrName(dpId);
        if (dp) {
          // console.log('Opening DP modal from hash:', dp.name);
          setDpDetail(dp);
          setSubmissionDetail(null);
        } else {
          // console.log('DP not found for hash:', dpId);
        }
      }
      
      // Check for URL parameter navigation (?DP4, ?dp7, etc.)
      const dpParam = urlParams.get('dp') || urlParams.get('DP');
      if (dpParam) {
        const dpId = dpParam.toUpperCase();
        // console.log('Looking for DP from URL param:', dpId);
        
        const dp = getDPByIdOrName(dpId);
        if (dp) {
          // console.log('Opening DP modal from URL param:', dp.name);
          setDpDetail(dp);
          setSubmissionDetail(null);
        } else {
          // console.log('DP not found for URL param:', dpId);
        }
      }
    };

    // Handle initial load
    handleHashAndParams();

    // Listen for hash changes
    const handleHashChange = () => {
      // console.log('Hash changed to:', window.location.hash);
      handleHashAndParams();
    };

    // Listen for URL parameter changes (popstate event)
    const handlePopState = () => {
      // console.log('URL changed to:', window.location.href);
      handleHashAndParams();
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    
    // Also listen for pushstate/replacestate (for programmatic URL changes)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(handleHashAndParams, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(handleHashAndParams, 0);
    };
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [data]); // Re-run when data loads

  // Debug useEffect for modal states
  useEffect(() => {
    // console.log('dpDetail state changed:', dpDetail?.name || 'null');
  }, [dpDetail]);

  useEffect(() => {
    // console.log('submissionDetail state changed:', submissionDetail?.title || 'null');
  }, [submissionDetail]);

  const toggleProperty = (propertyId: string) => {
    const newExpanded = new Set(expandedProperties);
    if (newExpanded.has(propertyId)) {
      newExpanded.delete(propertyId);
    } else {
      newExpanded.add(propertyId);
    }
    setExpandedProperties(newExpanded);
  };

  const toggleSubmission = (submissionNumber: number) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionNumber)) {
      newExpanded.delete(submissionNumber);
    } else {
      newExpanded.add(submissionNumber);
    }
    setExpandedSubmissions(newExpanded);
  };

  // Search function that calls the API
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearchLoading(true);
      // console.log('Performing search for:', query);
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const results = await response.json();
      // console.log('Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        performSearch(searchTerm);
      } else {
        setSearchResults(null);
      }
    }, 300); // 300ms delay

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const filteredProperties = data?.desirable_properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || property.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const filteredSubmissions = submissions.filter(submission => {
    const searchLower = searchTerm.toLowerCase();
    return submission.title.toLowerCase().includes(searchLower) ||
           submission.overview.toLowerCase().includes(searchLower) ||
           (Array.isArray(submission.directlyAddressedDPs) && submission.directlyAddressedDPs.some(dp => 
             dp.dp.toLowerCase().includes(searchLower) || 
             dp.summary.toLowerCase().includes(searchLower)
           ));
  });

  // Helper: Find all submissions aligned to a DP
  const getSubmissionsForDP = (dpId: string) => {
    // console.log('getSubmissionsForDP called with:', dpId);
    const result = submissions.filter(sub =>
      Array.isArray(sub.directlyAddressedDPs) && sub.directlyAddressedDPs.some(dp => {
        // Extract DP number from both strings for exact matching
        const dpNumber = dp.dp.match(/^DP(\d+)/)?.[1];
        const targetNumber = dpId.match(/^DP(\d+)/)?.[1];
        
        // Exact DP number match
        if (dpNumber && targetNumber && dpNumber === targetNumber) {
          return true;
        }
        
        // Fallback to original logic for non-numeric cases
        return dp.dp.replace(/^DP\d+\s*-\s*/, '').trim() === dpId.replace(/^DP\d+\s*-\s*/, '').trim() || 
               dp.dp === dpId;
      })
    );
    
    // Deduplicate submissions by title and submitter
    const uniqueSubmissions = result.filter((sub, index, self) => {
                const key = `${sub.title}-${sub.submitter.firstName}-${sub.submitter.lastName}`;
              return index === self.findIndex(s => 
          `${s.title}-${s.submitter.firstName}-${s.submitter.lastName}` === key
        );
    });
    
    // console.log('Found submissions:', result.length, 'Unique submissions:', uniqueSubmissions.length);
    return uniqueSubmissions;
  };

  // Helper: Find DP by id or name
  const getDPByIdOrName = (idOrName: string) => {
    // console.log('getDPByIdOrName called with:', idOrName);
    
    // First try exact match
    let result = data?.desirable_properties.find(dp => dp.id === idOrName || dp.name === idOrName);
    
    // If no exact match, try to extract DP ID from format like "DP1 - Federated Authentication & Accountability"
    if (!result && idOrName.includes(' - ')) {
      const dpId = idOrName.split(' - ')[0];
      result = data?.desirable_properties.find(dp => dp.id === dpId);
    }
    
    // If still no match and it's a number, try adding "DP" prefix
    if (!result && /^\d+$/.test(idOrName)) {
      const dpId = `DP${idOrName}`;
      console.log('Trying with DP prefix:', dpId);
      result = data?.desirable_properties.find(dp => dp.id === dpId);
    }
    
    // If still no match, try partial name matching
    if (!result) {
      result = data?.desirable_properties.find(dp => 
        dp.name.toLowerCase().includes(idOrName.toLowerCase()) ||
        idOrName.toLowerCase().includes(dp.name.toLowerCase())
      );
    }
    
    console.log('Found DP:', result);
    return result;
  };

  // Helper function to get top DPs by type
  const toggleComments = (elementId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  };

  const updateCommentCount = (elementId: string, count: number) => {
    setCommentCounts(prev => ({
      ...prev,
      [elementId]: count
    }));
  };

  // Pre-fetch all comment and vote counts for all submissions together
  const fetchAllSubmissionCounts = async (submissionsList: Submission[]) => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      // Create all fetch promises for all submissions
      const allFetchPromises: Promise<void>[] = [];
      
      for (const submission of submissionsList) {
        // Submission-level comments and votes
        allFetchPromises.push(
          fetch(`/api/comments?submissionId=${submission.id}`, { headers })
            .then(async (response) => {
              if (response.ok) {
                const comments = await response.json();
                const count = Array.isArray(comments) ? comments.length : 0;
                updateCommentCount(submission.id, count);
              }
            }),
          fetch(`/api/votes?submissionId=${submission.id}`, { headers })
            .then(async (response) => {
              if (response.ok) {
                const voteData = await response.json();
                setVoteCounts(prev => ({
                  ...prev,
                  [submission.id]: {
                    upvotes: voteData.upvotes || 0,
                    downvotes: voteData.downvotes || 0,
                    userVote: voteData.userVote || null
                  }
                }));
              }
            })
        );
        
        // DP comments and votes
        for (let dpIndex = 0; dpIndex < (submission.directlyAddressedDPs?.length || 0); dpIndex++) {
          const dpElementId = `${submission.id}-dp-${dpIndex}`;
          
          allFetchPromises.push(
            fetch(`/api/comments?submissionId=${submission.id}&elementId=${dpElementId}&elementType=alignment`, { headers })
              .then(async (response) => {
                if (response.ok) {
                  const comments = await response.json();
                  const count = Array.isArray(comments) ? comments.length : 0;
                  updateCommentCount(dpElementId, count);
                }
              }),
            fetch(`/api/votes?submissionId=${submission.id}&elementId=${dpElementId}&elementType=alignment`, { headers })
              .then(async (response) => {
                if (response.ok) {
                  const voteData = await response.json();
                  setVoteCounts(prev => ({
                    ...prev,
                    [dpElementId]: {
                      upvotes: voteData.upvotes || 0,
                      downvotes: voteData.downvotes || 0,
                      userVote: voteData.userVote || null
                    }
                  }));
                }
              })
          );
        }
        
        // Clarification/Extension comments and votes
        for (let ceIndex = 0; ceIndex < (submission.clarificationsExtensions?.length || 0); ceIndex++) {
          const ceElementId = `${submission.id}-ce-${ceIndex}`;
          const ceType = submission.clarificationsExtensions[ceIndex].type.toLowerCase();
          
          allFetchPromises.push(
            fetch(`/api/comments?submissionId=${submission.id}&elementId=${ceElementId}&elementType=${ceType}`, { headers })
              .then(async (response) => {
                if (response.ok) {
                  const comments = await response.json();
                  const count = Array.isArray(comments) ? comments.length : 0;
                  updateCommentCount(ceElementId, count);
                }
              }),
            fetch(`/api/votes?submissionId=${submission.id}&elementId=${ceElementId}&elementType=${ceType}`, { headers })
              .then(async (response) => {
                if (response.ok) {
                  const voteData = await response.json();
                  setVoteCounts(prev => ({
                    ...prev,
                    [ceElementId]: {
                      upvotes: voteData.upvotes || 0,
                      downvotes: voteData.downvotes || 0,
                      userVote: voteData.userVote || null
                    }
                  }));
                }
              })
          );
        }
      }
      
      // Wait for all promises to complete before continuing
      await Promise.all(allFetchPromises);
    } catch (error) {
      console.error('Error pre-fetching all submission counts:', error);
    }
  };

  // Abstracted function to open submission detail modal
  const openSubmissionDetail = (submission: Submission) => {
    setSubmissionDetail(submission);
  };

  // Calculate total comment count for a submission (including all elements)
  const getTotalCommentCount = (submission: Submission) => {
    let total = commentCounts[submission.id] || 0;
    
    // Add comments on alignment elements
    if (Array.isArray(submission.directlyAddressedDPs)) {
      submission.directlyAddressedDPs.forEach((_, dpIndex) => {
        total += commentCounts[`${submission.id}-dp-${dpIndex}`] || 0;
      });
    }
    
    // Add comments on clarification/extension elements
    if (Array.isArray(submission.clarificationsExtensions)) {
      submission.clarificationsExtensions.forEach((item, itemIndex) => {
        total += commentCounts[`${submission.id}-ce-${itemIndex}`] || 0;
      });
    }
    
    return total;
  };

  const getTopDPs = (type: 'alignments' | 'clarifications' | 'extensions') => {
    const dpCounts: { [key: string]: number } = {};
    
    submissions.forEach(submission => {
      if (type === 'alignments') {
        if (Array.isArray(submission.directlyAddressedDPs)) {
          submission.directlyAddressedDPs.forEach(dp => {
            dpCounts[dp.dp] = (dpCounts[dp.dp] || 0) + 1;
          });
        }
      } else {
        if (Array.isArray(submission.clarificationsExtensions)) {
          submission.clarificationsExtensions
            .filter(ce => ce.type === (type === 'clarifications' ? 'Clarification' : 'Extension'))
            .forEach(ce => {
              dpCounts[ce.dp] = (dpCounts[ce.dp] || 0) + 1;
            });
        }
      }
    });
    
    return Object.entries(dpCounts)
      .map(([dp, count]) => ({ dp, count }))
      .sort((a, b) => b.count - a.count);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  // DP Detail Modal
  const renderDPDetail = (dp: DesirableProperty) => {
    // console.log('renderDPDetail called for:', dp.name);
    // console.log('DP landing fields:', {
    //   landing_title: dp.landing_title,
    //   landing_subtitle: dp.landing_subtitle,
    //   landing_text: dp.landing_text
    // });
    const relatedSubmissions = getSubmissionsForDP(dp.id);
    return (
      <div>
        {/* Landing fields at the top */}
        {(dp.landing_title || dp.landing_subtitle || dp.landing_text) && (
          <div className="mb-8">
            {dp.landing_title && <h1 className="text-3xl font-bold text-cyan-400 mb-2">{dp.landing_title}</h1>}
            {dp.landing_subtitle && <h2 className="text-xl text-cyan-200 mb-2">{dp.landing_subtitle}</h2>}
            {dp.landing_text && <p className="text-gray-200 mb-4">{dp.landing_text}</p>}
          </div>
        )}
        <h2 className="text-2xl font-bold mb-2 text-white">{dp.name} <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded">{dp.id}</span></h2>
        <p className="text-amber-200 mb-2">Category: {dp.category}</p>
        <p className="mb-4 text-gray-200">{dp.description}</p>
        <h3 className="text-lg font-semibold mt-6 mb-2 text-white">Elements</h3>
        <ul className="mb-4 list-disc pl-6">
          {Array.isArray(dp.elements) ? dp.elements.map((el, i) => (
            <li key={i} className="mb-1 text-gray-200"><span className="font-medium text-amber-200">{el.name}:</span> {el.description}</li>
          )) : null}
        </ul>
        <h3 className="text-lg font-semibold mt-6 mb-2 text-white">Aligned Community Submissions</h3>
        
        {/* Stats for this DP */}
        <div className="flex items-center gap-6 mb-4 text-sm">
          <div className="flex items-center gap-2 text-cyan-400">
            <MessageCircle className="h-4 w-4" />
            <span>{relatedSubmissions.reduce((total, sub) => total + (Array.isArray(sub.directlyAddressedDPs) ? sub.directlyAddressedDPs.filter(alignment => {
              const dpNumber = alignment.dp.match(/^DP(\d+)/)?.[1];
              const targetNumber = dp.id.match(/^DP(\d+)/)?.[1];
              return dpNumber && targetNumber && dpNumber === targetNumber;
            }).length : 0), 0)} alignments</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400">
            <Lightbulb className="h-4 w-4" />
            <span>{relatedSubmissions.reduce((total, sub) => total + (Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.filter(ce => {
              const ceDpNumber = ce.dp.match(/^DP(\d+)/)?.[1];
              const targetNumber = dp.id.match(/^DP(\d+)/)?.[1];
              return ceDpNumber && targetNumber && ceDpNumber === targetNumber && ce.type === 'Extension';
            }).length : 0), 0)} extensions</span>
          </div>
          <div className="flex items-center gap-2 text-yellow-400">
            <HelpCircle className="h-4 w-4" />
            <span>{relatedSubmissions.reduce((total, sub) => total + (Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.filter(ce => {
              const ceDpNumber = ce.dp.match(/^DP(\d+)/)?.[1];
              const targetNumber = dp.id.match(/^DP(\d+)/)?.[1];
              return ceDpNumber && targetNumber && ceDpNumber === targetNumber && ce.type === 'Clarification';
            }).length : 0), 0)} clarifications</span>
          </div>
        </div>
        
        {relatedSubmissions.length === 0 ? (
          <p className="text-gray-400">No submissions aligned to this property.</p>
        ) : (
          <ul className="space-y-3">
            {relatedSubmissions.map((sub, i) => (
              <li key={i}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                <button 
                  className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium text-left" 
                  onClick={() => {
                    // console.log('=== SETTING SUBMISSION DETAIL FROM DP DETAIL ===');
                    // console.log('Submission object being set:', sub);
                    // console.log('Submission directlyAddressedDPs:', sub.directlyAddressedDPs);
                    // console.log('Submission clarificationsExtensions:', sub.clarificationsExtensions);
                    // console.log('Opening submission detail for:', sub.title);
                    openSubmissionDetail(sub);
                    setDpDetail(null);
                  }}
                >
                                      {sub.title}
                </button>
                                  <div className="text-xs text-gray-400">By: {(sub.submitter.firstName || sub.submitter.lastName) ? `${sub.submitter.firstName || ''} ${sub.submitter.lastName || ''}`.trim() : 'Anon'}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <UnifiedVotingDisplay
                      elementId={sub.id}
                      elementType="submission"
                      submissionId={sub.id}
                      showComments={true}
                      commentCount={commentCounts[sub.id] || 0}
                      onCommentToggle={() => toggleComments(sub.id)}
                      commentsExpanded={expandedComments.has(sub.id)}
                    />
                  </div>
                </div>
                {/* Show alignment summary if present */}
                {(() => {
                  const alignment = Array.isArray(sub.directlyAddressedDPs) ? sub.directlyAddressedDPs.find(a => 
                    a.dp === dp.id || 
                    a.dp === dp.name || 
                    a.dp.startsWith(dp.id + ' ') ||
                    a.dp.includes(dp.name)
                  ) : null;
                  return alignment && alignment.summary ? (
                    <div className="text-sm text-amber-300 mt-1">{alignment.summary}</div>
                  ) : null;
                })()}
                {/* Show clarifications/extensions for this DP from this submission */}
                <div className="ml-2 mt-1">
                  {Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.filter(c => {
                    // Extract DP number from both strings for exact matching
                    const cDpNumber = c.dp.match(/^DP(\d+)/)?.[1];
                    const targetDpNumber = dp.id.match(/^DP(\d+)/)?.[1];
                    
                    // Exact DP number match
                    if (cDpNumber && targetDpNumber && cDpNumber === targetDpNumber) {
                      return true;
                    }
                    
                    // Fallback to original logic for non-numeric cases
                    return c.dp === dp.id || c.dp.includes(dp.name);
                  }).map((c, j) => (
                    <div key={j} className="text-sm mb-1">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                      <span className="font-semibold text-amber-300">{c.type}:</span> <span className="font-semibold text-white">{c.title}</span>
                      <div className="text-gray-200 ml-2">
                        <div><span className="italic text-amber-200">{c.type}:</span> {c.content}</div>
                        <div className="text-xs text-amber-300">Why it matters: {c.whyItMatters}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <UnifiedVotingDisplay
                            elementId={`${sub.id}-ce-${j}`}
                            elementType={c.type.toLowerCase() as 'clarification' | 'extension'}
                            submissionId={sub.id}
                            showComments={true}
                            commentCount={commentCounts[`${sub.id}-ce-${j}`] || 0}
                            onCommentToggle={() => toggleComments(`${sub.id}-ce-${j}`)}
                            commentsExpanded={expandedComments.has(`${sub.id}-ce-${j}`)}
                          />
                        </div>
                      </div>
                      
                      {/* Comments for Clarification/Extension in DP Detail Modal - Collapsible */}
                      {expandedComments.has(`${sub.id}-ce-${j}`) && (
                        <div className="mt-3">
                          <CommentSection
                            elementId={`${sub.id}-ce-${j}`}
                            elementType={c.type.toLowerCase() as 'clarification' | 'extension'}
                            submissionId={sub.id}
                            onCommentCountChange={(count) => updateCommentCount(`${sub.id}-ce-${j}`, count)}
                          />
                        </div>
                      )}
                    </div>
                  )) : null}
                </div>
                
                {/* Comments for Submission in DP Detail Modal - Collapsible */}
                {expandedComments.has(sub.id) && (
                  <div className="mt-3">
                    <CommentSection
                      elementId={sub.id}
                      elementType="submission"
                      submissionId={sub.id}
                      onCommentCountChange={(count) => updateCommentCount(sub.id, count)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Submission Detail Modal
  const renderSubmissionDetail = (sub: Submission) => {
    // console.log('=== RENDER SUBMISSION DETAIL START ===');
    // console.log('Submission object:', sub);
    // console.log('Submission type:', typeof sub);
    // console.log('Submission keys:', Object.keys(sub));
    
    try {
      // console.log('=== CREATING SAFE SUBMISSION ===');
      // Defensive checks to ensure all array properties are actually arrays
      const safeSubmission = {
        ...sub,
        directlyAddressedDPs: Array.isArray(sub.directlyAddressedDPs) ? sub.directlyAddressedDPs : [],
        clarificationsExtensions: Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions : []
      };
      // console.log('Safe submission created:', safeSubmission);
      // console.log('Safe directlyAddressedDPs:', safeSubmission.directlyAddressedDPs);
      // console.log('Safe clarificationsExtensions:', safeSubmission.clarificationsExtensions);

      // console.log('=== RENDERING SUBMISSION DETAIL ===');
      return (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">{safeSubmission.title}</h2>
          </div>

          {/* Submitter Info */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-300">
                By: {(safeSubmission.submitter.firstName || safeSubmission.submitter.lastName) 
                  ? `${safeSubmission.submitter.firstName || ''} ${safeSubmission.submitter.lastName || ''}`.trim() 
                  : 'Anonymous'}
              </p>
                            <div className="flex items-center gap-4">
                <UnifiedVotingDisplay
                  elementId={safeSubmission.id}
                  elementType="submission"
                  submissionId={safeSubmission.id}
                  showComments={true}
                  commentCount={commentCounts[safeSubmission.id] || 0}
                  onCommentToggle={() => toggleComments(safeSubmission.id)}
                  commentsExpanded={expandedComments.has(safeSubmission.id)}
                />
              </div>
            </div>
          </div>



          {/* Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
            <p className="text-gray-300 leading-relaxed">{safeSubmission.overview}</p>
          </div>

          {/* Source Link */}
          {safeSubmission.sourceLink && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-2">Source</h3>
              <a 
                href={safeSubmission.sourceLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                {safeSubmission.sourceLink}
              </a>
            </div>
          )}

          {/* Directly Addressed DPs */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Directly Addressed Desirable Properties</h3>
            <div className="space-y-3">
              {safeSubmission.directlyAddressedDPs && safeSubmission.directlyAddressedDPs.length > 0 ? (
                safeSubmission.directlyAddressedDPs.map((dp: { dp: string; summary: string }, dpIndex: number) => {
                  // console.log('=== MAPPING DIRECTLY ADDRESSED DP ===');
                  // console.log('DP:', dp);
                  // console.log('DP Index:', dpIndex);
                  return (
                    <div key={dpIndex} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-cyan-400">{dp.dp}</h4>
                        <div className="flex items-center gap-2">
                          <UnifiedVotingDisplay
                            elementId={`${safeSubmission.id}-dp-${dpIndex}`}
                            elementType="alignment"
                            submissionId={safeSubmission.id}
                            showComments={true}
                            commentCount={commentCounts[`${safeSubmission.id}-dp-${dpIndex}`] || 0}
                            onCommentToggle={() => toggleComments(`${safeSubmission.id}-dp-${dpIndex}`)}
                            commentsExpanded={expandedComments.has(`${safeSubmission.id}-dp-${dpIndex}`)}
                          />
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-3">{dp.summary}</p>
                      
                      {/* Comments for DP - Collapsible */}
                      {expandedComments.has(`${safeSubmission.id}-dp-${dpIndex}`) && (
                        <div className="mt-3">
                          <CommentSection
                            elementId={`${safeSubmission.id}-dp-${dpIndex}`}
                            elementType="alignment"
                            submissionId={safeSubmission.id}
                            onCommentCountChange={(count) => updateCommentCount(`${safeSubmission.id}-dp-${dpIndex}`, count)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 italic">No directly addressed desirable properties listed.</p>
              )}
            </div>
          </div>

          {/* Clarifications and Extensions */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Clarifications and Extensions</h3>
            <div className="space-y-4">
              {safeSubmission.clarificationsExtensions && safeSubmission.clarificationsExtensions.length > 0 ? (
                safeSubmission.clarificationsExtensions.map((item: { dp: string; type: string; title: string; content: string; whyItMatters: string }, itemIndex: number) => {
                  // console.log('=== MAPPING CLARIFICATIONS EXTENSIONS ===');
                  // console.log('Item:', item);
                  // console.log('Item Index:', itemIndex);
                  return (
                    <div key={itemIndex} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.type === 'Clarification' 
                              ? 'bg-blue-600 text-blue-100' 
                              : 'bg-green-600 text-green-100'
                          }`}>
                            {item.type}
                          </span>
                          <h4 className="font-medium text-cyan-400">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <UnifiedVotingDisplay
                            elementId={`${safeSubmission.id}-ce-${itemIndex}`}
                            elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                            submissionId={safeSubmission.id}
                            showComments={true}
                            commentCount={commentCounts[`${safeSubmission.id}-ce-${itemIndex}`] || 0}
                            onCommentToggle={() => toggleComments(`${safeSubmission.id}-ce-${itemIndex}`)}
                            commentsExpanded={expandedComments.has(`${safeSubmission.id}-ce-${itemIndex}`)}
                          />
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{item.dp}</p>
                      <p className="text-gray-300 text-sm mb-3">{item.content}</p>
                      <p className="text-gray-300 text-sm mb-3">
                        <span className="text-gray-400">Why it matters:</span> {item.whyItMatters}
                      </p>
                      


                      {/* Comments for Clarification/Extension - Collapsible */}
                      {expandedComments.has(`${safeSubmission.id}-ce-${itemIndex}`) && (
                        <div className="mt-3">
                          <CommentSection
                            elementId={`${safeSubmission.id}-ce-${itemIndex}`}
                            elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                            submissionId={safeSubmission.id}
                            onCommentCountChange={(count) => updateCommentCount(`${safeSubmission.id}-ce-${itemIndex}`, count)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-400 italic">No clarifications or extensions listed.</p>
              )}
            </div>
          </div>

          {/* Submission-Level Comments - Collapsible */}
          {expandedComments.has(safeSubmission.id) && (
            <div className="comments-section mt-4">
              <h3 className="text-lg font-semibold text-white mb-4">Comments</h3>
              <CommentSection
                elementId={safeSubmission.id}
                elementType="submission"
                submissionId={safeSubmission.id}
                onCommentCountChange={(count) => updateCommentCount(safeSubmission.id, count)}
              />
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('=== ERROR IN RENDER SUBMISSION DETAIL ===');
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('Submission that caused error:', sub);
      return (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Submission Details</h2>
            <button
              onClick={() => setSubmissionDetail(null)}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-red-200 mb-2">Error Loading Submission</h3>
            <p className="text-red-300">
              There was an error loading the submission details. Please try refreshing the page or contact support if the problem persists.
            </p>
            <p className="text-red-400 text-sm mt-2">
              Error: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <div className="text-gray-300">
            <p><strong>Title:</strong> {sub.title}</p>
            <p><strong>Overview:</strong> {sub.overview}</p>
          </div>
        </div>
      );
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
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    setActiveTab('properties');
                  }}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'properties'
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                  scroll={false}
                >
                  <FileText className="h-4 w-4" />
                  Desirable Properties
                </Link>
                <Link
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    setActiveTab('submissions');
                  }}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'submissions'
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                  scroll={false}
                >
                  <Users className="h-4 w-4" />
                  Submissions
                </Link>
                <Link
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    setActiveTab('categories');
                  }}
                  className={`py-4 px-2 sm:px-1 border-b-2 font-medium text-sm flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                    activeTab === 'categories'
                      ? 'border-blue-400 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                  scroll={false}
                >
                  <Filter className="h-4 w-4" />
                  Categories
                </Link>
                  <Link 
                    href="/leaderboard" 
                    className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                  >
                    <Trophy className="h-5 w-5" />
                    <span className="text-sm hidden sm:inline">Leaderboard</span>
                  </Link>
                  
                  {/* Chat Assistant Button */}
                              <button
                onClick={() => {
                  console.log('🔍 [Page] Assistant button clicked');
                  setChatModalOpen(true);
                }}
                className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                title="Chat with AI Assistant"
            >
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Assistant</span>
            </button>
                  {authenticated ? (
                    <>
                      <Link 
                        href="/profile" 
                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm hidden sm:inline">
                          Profile
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


      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 mb-8 text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-cyan-400 mb-2">
          The Desirable Properties of a Meta-Layer
        </h1>
        <p className="text-lg sm:text-xl text-gray-300 max-w-[600px] mx-auto break-words">
          Community-defined desirable properties for a trustworthy and safe coordination zone above the webpage
        </p>
      </div>


      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties, submissions, and categories..."
                value={searchTerm}
                onChange={(e) => {
                  // console.log('Search input changed:', e.target.value);
                  setSearchTerm(e.target.value);
                }}
                                  onKeyDown={(e) => {
                    // console.log('Search keydown event:', e.key, 'value:', e.currentTarget.value);
                  }}
                  onKeyUp={(e) => {
                    // console.log('Search keyup event:', e.key, 'value:', e.currentTarget.value);
                  }}
                className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white placeholder-gray-400"
              />
              {searchLoading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Category Filter - Only show for properties */}
            {activeTab === 'properties' && (
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-700 text-white"
                >
                  <option value="all">All Categories</option>
                  {Array.isArray(data?.meta.categories) ? data.meta.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  )) : null}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-300">
            {searchResults 
              ? `Search results for "${searchTerm}" (${searchResults.total_results} total)`
              : activeTab === 'properties'
              ? `Showing ${filteredProperties.length} of ${data?.meta.total_properties} properties`
              : activeTab === 'submissions'
              ? `Showing ${filteredSubmissions.length} of ${submissions.length} submissions`
              : null
            }
          </p>
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-6 space-y-6">
            {/* Desirable Properties Results */}
            {searchResults.results.desirable_properties.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Desirable Properties ({searchResults.results.desirable_properties.length})
                </h3>
                <div className="space-y-4">
                  {Array.isArray(searchResults.results.desirable_properties) ? searchResults.results.desirable_properties.map((result: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <button 
                        onClick={() => {
                          setDpDetail(result.item);
                          setSearchResults(null);
                          setSearchTerm('');
                        }}
                        className="text-left w-full hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <h4 className="font-semibold text-blue-600 hover:text-blue-800">{result.item.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{result.item.category}</p>
                        <p className="text-gray-700">{result.item.description}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Match score: {(1 - (result.score || 0)).toFixed(2)} • Click to view details
                        </div>
                      </button>
                    </div>
                  )) : null}
                </div>
              </div>
            )}

            {/* Submissions Results */}
            {searchResults.results.submissions.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Submissions ({searchResults.results.submissions.length})
                </h3>
                <div className="space-y-4">
                  {Array.isArray(searchResults.results.submissions) ? searchResults.results.submissions.map((result: any, index: number) => (
                    <div key={index} className="border-l-4 border-green-500 pl-4">
                      <button 
                        onClick={() => {
                                            // console.log('=== SETTING SUBMISSION DETAIL FROM SEARCH RESULTS ===');
                  // console.log('Search result item being set:', result.item);
                  // console.log('Search result item directlyAddressedDPs:', result.item.directlyAddressedDPs);
                  // console.log('Search result item clarificationsExtensions:', result.item.clarificationsExtensions);
                          openSubmissionDetail(result.item);
                          setSearchResults(null);
                          setSearchTerm('');
                        }}
                        className="text-left w-full hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <h4 className="font-semibold text-green-600 hover:text-green-800">{result.item.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          By: {result.item.submitter.firstName || ''} {result.item.submitter.lastName || ''}
                        </p>
                        <p className="text-gray-700">{result.item.overview}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Match score: {(1 - (result.score || 0)).toFixed(2)} • Click to view details
                        </div>
                      </button>
                    </div>
                  )) : null}
                </div>
              </div>
            )}

            {/* Categories Results */}
            {searchResults.results.categories.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Categories ({searchResults.results.categories.length})
                </h3>
                <div className="space-y-4">
                  {Array.isArray(searchResults.results.categories) ? searchResults.results.categories.map((result: any, index: number) => (
                    <div key={index} className="border-l-4 border-purple-500 pl-4">
                      <button 
                        onClick={() => {
                          setActiveTab('properties');
                          setSelectedCategory(result.item.name);
                          setSearchResults(null);
                          setSearchTerm('');
                        }}
                        className="text-left w-full hover:bg-gray-50 p-2 rounded transition-colors"
                      >
                        <h4 className="font-semibold text-purple-600 hover:text-purple-800">{result.item.name}</h4>
                        <p className="text-gray-700">{result.item.description}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Match score: {(1 - (result.score || 0)).toFixed(2)} • Click to view properties in this category
                        </div>
                      </button>
                    </div>
                  )) : null}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content based on active tab - Hide when search results are shown */}
        {!searchResults && (
          <>
            {activeTab === 'summary' ? (
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Meta-Layer Initiative Overview</h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                The Meta-Layer Initiative is a collaborative effort to define and implement the foundational 
                principles for a decentralized digital infrastructure that serves communities rather than corporations. 
                This platform showcases the 21 canonical Desirable Properties and community submissions that 
                address, support, extend, or clarify these properties.
              </p>
              
              {/* Six Buttons in One Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <button 
                  onClick={() => setActiveTab('properties')}
                  className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 hover:shadow-md hover:bg-gray-600 transition-shadow duration-200 text-center group"
                >
                  <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-1 sm:mb-2">
                    {data?.meta.total_properties || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Desirable Properties</div>
                </button>

                <button 
                  onClick={() => setActiveTab('submissions')}
                  className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 hover:shadow-md hover:bg-gray-600 transition-shadow duration-200 text-center group"
                >
                  <div className="text-xl sm:text-2xl font-bold text-green-400 mb-1 sm:mb-2">
                    {submissions.length}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Submissions</div>
                </button>

                <button 
                  onClick={() => setActiveTab('categories')}
                  className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 hover:shadow-md hover:bg-gray-600 transition-shadow duration-200 text-center group"
                >
                  <div className="text-xl sm:text-2xl font-bold text-purple-400 mb-1 sm:mb-2">
                    {data?.meta.categories.length || 0}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Property Categories</div>
                </button>

                <div className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-blue-400 mb-1 sm:mb-2">
                    {submissions.reduce((total, sub) => total + (Array.isArray(sub.directlyAddressedDPs) ? sub.directlyAddressedDPs.length : 0), 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Alignments</div>
                </div>

                <div className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-green-400 mb-1 sm:mb-2">
                    {submissions.reduce((total, sub) => total + (Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.filter(ce => ce.type === 'Clarification').length : 0), 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Clarifications</div>
                </div>

                <div className="bg-gray-700 rounded-lg shadow-sm border border-gray-600 p-3 sm:p-4 text-center">
                  <div className="text-xl sm:text-2xl font-bold text-purple-400 mb-1 sm:mb-2">
                    {submissions.reduce((total, sub) => total + (Array.isArray(sub.clarificationsExtensions) ? sub.clarificationsExtensions.filter(ce => ce.type === 'Extension').length : 0), 0)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-300">Extensions</div>
                </div>
              </div>
            </div>

            {/* Top DPs Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Most Aligned DPs */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Most Aligned DPs</h3>
                <div className="space-y-2">
                  {(() => {
                    const topDPs = getTopDPs('alignments');
                    return Array.isArray(topDPs) ? topDPs.slice(0, 10).map((dp) => (
                      <div key={dp.dp} className="flex justify-between items-center">
                        <button 
                          onClick={() => {
                            setActiveTab('properties');
                            setSearchTerm(dp.dp);
                          }}
                          className="text-blue-400 hover:text-blue-300 underline text-left"
                        >
                          {dp.dp}
                        </button>
                        <span className="text-sm text-gray-400">{dp.count}</span>
                      </div>
                    )) : null;
                  })()}
                </div>
              </div>

              {/* Most Clarifications */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Most Clarifications</h3>
                <div className="space-y-2">
                  {(() => {
                    const topDPs = getTopDPs('clarifications');
                    return Array.isArray(topDPs) ? topDPs.slice(0, 10).map((dp) => (
                      <div key={dp.dp} className="flex justify-between items-center">
                        <button 
                          onClick={() => {
                            setActiveTab('properties');
                            setSearchTerm(dp.dp);
                          }}
                          className="text-blue-400 hover:text-blue-300 underline text-left"
                        >
                          {dp.dp}
                        </button>
                        <span className="text-sm text-gray-400">{dp.count}</span>
                      </div>
                    )) : null;
                  })()}
                </div>
              </div>

              {/* Most Extensions */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Most Extensions</h3>
                <div className="space-y-2">
                  {(() => {
                    const topDPs = getTopDPs('extensions');
                    return Array.isArray(topDPs) ? topDPs.slice(0, 10).map((dp) => (
                      <div key={dp.dp} className="flex justify-between items-center">
                        <button 
                          onClick={() => {
                            setActiveTab('properties');
                            setSearchTerm(dp.dp);
                          }}
                          className="text-blue-400 hover:text-blue-300 underline text-left"
                        >
                          {dp.dp}
                        </button>
                        <span className="text-sm text-gray-400">{dp.count}</span>
                      </div>
                    )) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* Categories as Links */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Property Categories</h3>
              <div className="flex flex-wrap gap-4">
                {Array.isArray(data?.meta.categories) ? data.meta.categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveTab('properties');
                      setSelectedCategory(category);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {category}
                  </button>
                )) : null}
              </div>
            </div>

            {/* Community Activity in Reverse Order */}
            <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Community Activity</h3>
              <div className="space-y-3">
                {Array.isArray(submissions) ? submissions.slice().reverse().slice(0, 5).map((submission, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium text-white">{submission.title}</div>
                      <div className="text-sm text-gray-300">
                        By {submission.submitter.firstName || ''} {submission.submitter.lastName || ''} 
                        {(!submission.submitter.firstName && !submission.submitter.lastName) && 'Anonymous'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        openSubmissionDetail(submission);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                )) : null}
              </div>
            </div>
          </div>
        ) : activeTab === 'properties' ? (
          /* Properties List */
          <div className="space-y-4">
            {filteredProperties.map((property: DesirableProperty) => (
              <div key={property.id} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={() => {
                            // console.log('DP title clicked:', property.name);
                            setDpDetail(property);
                          }}
                          className="text-xl font-semibold text-white hover:text-blue-400 transition-colors text-left"
                        >
                          {property.name}
                        </button>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                          {property.id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-3">{property.category}</p>
                      <p className="text-gray-200 leading-relaxed">{property.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProperty(property.id);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {expandedProperties.has(property.id) ? 
                        <ChevronUp className="h-5 w-5" /> : 
                        <ChevronDown className="h-5 w-5" />
                      }
                    </button>
                  </div>

                  {/* Expanded Elements */}
                  {expandedProperties.has(property.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-600">
                      <h4 className="text-lg font-medium text-white mb-4">Elements</h4>
                      <div className="space-y-4">
                        {Array.isArray(property.elements) ? property.elements.map((element, index) => (
                          <div key={index} className="bg-gray-700 rounded-lg p-4">
                            <h5 className="font-medium text-white mb-2">{element.name}</h5>
                            <p className="text-gray-200 text-sm leading-relaxed">{element.description}</p>
                          </div>
                        )) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'submissions' ? (
          /* Submissions List */
          <div className="space-y-4">
            {filteredSubmissions.map((submission: Submission, index: number) => (
              <div key={index} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={() => {
                                              // console.log('=== SETTING SUBMISSION DETAIL FROM SUBMISSIONS LIST ===');
                  // console.log('Submission object being set:', submission);
                  // console.log('Submission directlyAddressedDPs:', submission.directlyAddressedDPs);
                  // console.log('Submission clarificationsExtensions:', submission.clarificationsExtensions);
                  // console.log('Submission title clicked:', submission.title);
                            openSubmissionDetail(submission);
                          }}
                          className="text-xl font-semibold text-white hover:text-blue-400 transition-colors text-left"
                        >
                          {submission.title}
                        </button>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                        <span>
                          By: {submission.submitter.firstName || ''} {submission.submitter.lastName || ''} 
                          {(!submission.submitter.firstName && !submission.submitter.lastName) && 'Anonymous'}
                        </span>
                        <span>•</span>
                        <span>{submission.directlyAddressedDPs.length} DPs addressed</span>
                      </div>
                      <p className="text-gray-200 leading-relaxed">{submission.overview}</p>
                      <div className="mt-3">
                        <UnifiedElement
                          elementId={submission.id}
                          elementType="submission"
                          submissionId={submission.id}
                          showVotes={true}
                          showComments={true}
                          showAuthor={false}
                          showTimestamp={false}
                          commentCount={commentCounts[submission.id] || 0}
                          onCommentToggle={() => toggleComments(submission.id)}
                          initialUpvotes={submission.upvotes || 0}
                          initialDownvotes={submission.downvotes || 0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSubmissions.has(index) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Directly Addressed DPs */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Directly Addressed DPs</h4>
                          <div className="space-y-3">
                            {Array.isArray(submission.directlyAddressedDPs) ? submission.directlyAddressedDPs.map((dp: { dp: string; summary: string }, dpIndex: number) => (
                              <div key={dpIndex} className="bg-blue-50 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <button 
                                      onClick={() => {
                                        // console.log('DP reference clicked in submission:', dp.dp);
                                        const dpObj = getDPByIdOrName(dp.dp);
                                        if (dpObj) {
                                          setDpDetail(dpObj);
                                          setSubmissionDetail(null);
                                        }
                                      }}
                                      className="font-medium text-blue-900 mb-1 hover:text-blue-700 transition-colors text-left"
                                    >
                                      {dp.dp}
                                    </button>
                                    <p className="text-blue-700 text-sm">{dp.summary}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <UnifiedVotingDisplay
                                      elementId={`${submission.id}-dp-${dpIndex}`}
                                      elementType="alignment"
                                      submissionId={submission.id}
                                      showComments={true}
                                      commentCount={commentCounts[`${submission.id}-dp-${dpIndex}`] || 0}
                                      onCommentToggle={() => toggleComments(`${submission.id}-dp-${dpIndex}`)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Comments for Alignment */}
                                {expandedComments.has(`${submission.id}-dp-${dpIndex}`) && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <CommentSection
                                      elementId={`${submission.id}-dp-${dpIndex}`}
                                      elementType="alignment"
                                      submissionId={submission.id}
                                      onCommentCountChange={(count) => updateCommentCount(`${submission.id}-dp-${dpIndex}`, count)}
                                    />
                                  </div>
                                )}
                              </div>
                            )) : null}
                          </div>
                        </div>

                        {/* Clarifications and Extensions */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Clarifications & Extensions</h4>
                          <div className="space-y-3">
                            {Array.isArray(submission.clarificationsExtensions) ? submission.clarificationsExtensions.map((item: { dp: string; type: string; title: string; content: string; whyItMatters: string }, itemIndex: number) => (
                              <div key={itemIndex} className="bg-purple-50 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                        {item.type}
                                      </span>
                                      <h5 className="font-medium text-purple-900">{item.title}</h5>
                                    </div>
                                    <div className="mb-2">
                                      <span className="text-sm text-purple-700">For: </span>
                                      <button 
                                        onClick={() => {
                                          // console.log('DP reference clicked in clarification:', item.dp);
                                          const dpObj = getDPByIdOrName(item.dp);
                                          if (dpObj) {
                                            setDpDetail(dpObj);
                                            setSubmissionDetail(null);
                                          }
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                                      >
                                        {item.dp}
                                      </button>
                                    </div>
                                    {item.content && (
                                      <p className="text-purple-700 text-sm mb-2">{item.content}</p>
                                    )}
                                    <p className="text-purple-600 text-xs italic">Why it matters: {item.whyItMatters}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <UnifiedVotingDisplay
                                      elementId={`${submission.id}-ce-${itemIndex}`}
                                      elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                                      submissionId={submission.id}
                                      showComments={true}
                                      commentCount={commentCounts[`${submission.id}-ce-${itemIndex}`] || 0}
                                      onCommentToggle={() => toggleComments(`${submission.id}-ce-${itemIndex}`)}
                                    />
                                  </div>
                                </div>
                                
                                {/* Comments for Clarification/Extension */}
                                {expandedComments.has(`${submission.id}-ce-${itemIndex}`) && (
                                  <div className="mt-3 pt-3 border-t border-purple-200">
                                    <CommentSection
                                      elementId={`${submission.id}-ce-${itemIndex}`}
                                      elementType={item.type.toLowerCase() as 'clarification' | 'extension'}
                                      submissionId={submission.id}
                                      onCommentCountChange={(count) => updateCommentCount(`${submission.id}-ce-${itemIndex}`, count)}
                                    />
                                  </div>
                                )}
                              </div>
                            )) : null}
                          </div>
                        </div>
                      </div>

                      {/* Source Link */}
                      {submission.sourceLink && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <a
                            href={submission.sourceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View Source
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'categories' ? (
          /* Categories List */
          <div className="space-y-6">
            {Array.isArray(data?.meta.categories) ? data.meta.categories.map((category) => {
              const categoryProperties = data.desirable_properties.filter(property => property.category === category);
              const categorySubmissions = submissions.filter(submission => 
                (Array.isArray(submission.directlyAddressedDPs) && submission.directlyAddressedDPs.some(dp => 
                  categoryProperties.some(cp => dp.dp.includes(cp.id) || dp.dp.includes(cp.name))
                )) ||
                (Array.isArray(submission.clarificationsExtensions) && submission.clarificationsExtensions.some(ce => 
                  categoryProperties.some(cp => ce.dp.includes(cp.id) || ce.dp.includes(cp.name))
                ))
              );
              
              return (
                <div key={category} className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{category}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-300 mb-3">
                          <span>{categoryProperties.length} Desirable Properties</span>
                          <span>•</span>
                          <span>{categorySubmissions.length} Community Submissions</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('properties');
                          setSelectedCategory(category);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Properties
                      </button>
                    </div>
                    
                    {/* Category Properties Preview */}
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-white mb-3">Desirable Properties in this Category</h4>
                      <div className="grid gap-3">
                        {Array.isArray(categoryProperties) ? categoryProperties.map((property) => (
                          <div key={property.id} className="bg-gray-700 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                {property.id}
                              </span>
                              <button 
                                onClick={() => {
                                  // console.log('DP title clicked from category:', property.name);
                                  setDpDetail(property);
                                }}
                                className="font-medium text-white hover:text-blue-400 transition-colors text-left"
                              >
                                {property.name}
                              </button>
                            </div>
                            <p className="text-gray-200 text-sm leading-relaxed">{property.description}</p>
                          </div>
                        )) : null}
                      </div>
                    </div>

                    {/* Category Submissions Preview */}
                    {categorySubmissions.length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium text-white mb-3">Recent Community Submissions</h4>
                        <div className="space-y-3">
                          {Array.isArray(categorySubmissions) ? categorySubmissions.slice(0, 3).map((submission, index) => (
                            <div key={index} className="bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                                  #{index + 1}
                                </span>
                                <button 
                                  onClick={() => {
                                                      // console.log('=== SETTING SUBMISSION DETAIL FROM CATEGORIES ===');
                  // console.log('Submission object being set:', submission);
                  // console.log('Submission directlyAddressedDPs:', submission.clarificationsExtensions);
                  // console.log('Submission clarificationsExtensions:', submission.clarificationsExtensions);
                  // console.log('Submission title clicked from category:', submission.title);
                                    openSubmissionDetail(submission);
                                  }}
                                  className="font-medium text-white hover:text-green-400 transition-colors text-left"
                                >
                                  {submission.title}
                                </button>
                              </div>
                              <div className="text-sm text-gray-300 mb-2">
                                By: {submission.submitter.firstName || ''} {submission.submitter.lastName || ''} 
                                {(!submission.submitter.firstName && !submission.submitter.lastName) && 'Anonymous'}
                              </div>
                              <p className="text-gray-200 text-sm leading-relaxed">{submission.overview}</p>
                            </div>
                          )) : null}
                          {categorySubmissions.length > 3 && (
                            <div className="text-center">
                              <button
                                onClick={() => {
                                  setActiveTab('submissions');
                                  setSearchTerm(category);
                                }}
                                className="text-green-400 hover:text-green-300 text-sm font-medium"
                              >
                                View all {categorySubmissions.length} submissions for {category} →
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }) : null}
          </div>
        ) : (
          /* No Results */
          <div className="text-center py-12">
            <p className="text-gray-500">
              No {activeTab === 'properties' ? 'properties' : activeTab === 'submissions' ? 'submissions' : 'categories'} found matching your criteria.
            </p>
          </div>
        )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300">
              Meta-Layer Desirable Properties • Version {data?.meta.version} • Build <span id="build-version">Loading...</span>
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a
                href="https://github.com/meta-layer/desirable-properties"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-gray-100 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <Modal open={!!dpDetail} onClose={() => {
        // console.log('Closing DP detail modal');
        setDpDetail(null);
        // Clear hash and URL parameters when closing modal
        if (window.location.hash.startsWith('#dp')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        if (window.location.search.includes('dp=') || window.location.search.includes('DP=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('dp');
          url.searchParams.delete('DP');
          window.history.replaceState(null, '', url.pathname + url.search);
        }
      }}>
        {dpDetail && renderDPDetail(dpDetail)}
      </Modal>
      <Modal open={!!submissionDetail} onClose={() => {
        // console.log('Closing submission detail modal');
        setSubmissionDetail(null);
      }}>
        {submissionDetail && renderSubmissionDetail(submissionDetail)}
      </Modal>
      
      {/* Chat Modal */}
                  <ChatModal 
                isOpen={chatModalOpen} 
                onClose={() => {
                  console.log('🔍 [Page] ChatModal closing');
                  setChatModalOpen(false);
                }} 
                onCopySubmission={handleCopySubmission}
            />
    </div>
  );
}
