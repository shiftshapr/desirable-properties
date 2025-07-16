'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ExternalLink, Users, FileText, X, BarChart3 } from 'lucide-react';

interface DesirableProperty {
  id: string;
  name: string;
  category: string;
  description: string;
  elements: Array<{
    name: string;
    description: string;
  }>;
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
  submitter: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
  submission: {
    title: string;
    overview: string;
    source_link: string | null;
  };
  directly_addressed_dps: Array<{
    dp: string;
    summary: string;
  }>;
  clarifications_and_extensions: Array<{
    dp: string;
    type: string;
    title: string;
    clarification?: string;
    extension?: string;
    why_it_matters: string;
  }>;
  _metadata: {
    source_file: string;
    file_number: number;
  };
}

type TabType = 'summary' | 'properties' | 'submissions';

// Modal component
function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch both desirable properties and submissions
        const [propertiesResponse, submissionsResponse] = await Promise.all([
          fetch('/api/desirable-properties'),
          fetch('/api/submissions')
        ]);

        if (!propertiesResponse.ok) {
          throw new Error('Failed to fetch desirable properties');
        }
        if (!submissionsResponse.ok) {
          throw new Error('Failed to fetch submissions');
        }

        const propertiesData = await propertiesResponse.json();
        const submissionsData = await submissionsResponse.json();

        console.log('Loaded properties:', propertiesData.desirable_properties.length);
        console.log('Loaded submissions:', submissionsData.submissions?.length || 0);
        console.log('Sample property:', propertiesData.desirable_properties[0]);
        console.log('Sample submission:', submissionsData.submissions?.[0]);

        setData(propertiesData);
        setSubmissions(submissionsData.submissions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debug useEffect for modal states
  useEffect(() => {
    console.log('dpDetail state changed:', dpDetail?.name || 'null');
  }, [dpDetail]);

  useEffect(() => {
    console.log('submissionDetail state changed:', submissionDetail?.submission.title || 'null');
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

  const filteredProperties = data?.desirable_properties.filter(property => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || property.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) || [];

  const filteredSubmissions = submissions.filter(submission => {
    const searchLower = searchTerm.toLowerCase();
    return submission.submission.title.toLowerCase().includes(searchLower) ||
           submission.submission.overview.toLowerCase().includes(searchLower) ||
           submission.directly_addressed_dps.some(dp => 
             dp.dp.toLowerCase().includes(searchLower) || 
             dp.summary.toLowerCase().includes(searchLower)
           );
  });

  // Helper: Find all submissions aligned to a DP
  const getSubmissionsForDP = (dpId: string) => {
    console.log('getSubmissionsForDP called with:', dpId);
    const result = submissions.filter(sub =>
      sub.directly_addressed_dps.some(dp => dp.dp.replace(/^DP\d+\s*-\s*/, '').trim() === dpId.replace(/^DP\d+\s*-\s*/, '').trim() || dp.dp === dpId || dp.dp.startsWith(dpId))
    );
    console.log('Found submissions:', result.length);
    return result;
  };

  // Helper: Find DP by id or name
  const getDPByIdOrName = (idOrName: string) => {
    console.log('getDPByIdOrName called with:', idOrName);
    
    // First try exact match
    let result = data?.desirable_properties.find(dp => dp.id === idOrName || dp.name === idOrName);
    
    // If no exact match, try to extract DP ID from format like "DP1 - Federated Authentication & Accountability"
    if (!result && idOrName.includes(' - ')) {
      const dpId = idOrName.split(' - ')[0];
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
  const getTopDPs = (type: 'alignments' | 'clarifications' | 'extensions') => {
    const dpCounts: { [key: string]: number } = {};
    
    submissions.forEach(submission => {
      if (type === 'alignments') {
        submission.directly_addressed_dps.forEach(dp => {
          dpCounts[dp.dp] = (dpCounts[dp.dp] || 0) + 1;
        });
      } else {
        submission.clarifications_and_extensions
          .filter(ce => ce.type === (type === 'clarifications' ? 'Clarification' : 'Extension'))
          .forEach(ce => {
            dpCounts[ce.dp] = (dpCounts[ce.dp] || 0) + 1;
          });
      }
    });
    
    return Object.entries(dpCounts)
      .map(([dp, count]) => ({ dp, count }))
      .sort((a, b) => b.count - a.count);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        </div>
      </div>
    );
  }

  // DP Detail Modal
  const renderDPDetail = (dp: DesirableProperty) => {
    console.log('renderDPDetail called for:', dp.name);
    const relatedSubmissions = getSubmissionsForDP(dp.id);
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">{dp.name} <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{dp.id}</span></h2>
        <p className="text-gray-600 mb-2">Category: {dp.category}</p>
        <p className="mb-4 text-gray-700">{dp.description}</p>
        <h3 className="text-lg font-semibold mt-6 mb-2">Elements</h3>
        <ul className="mb-4 list-disc pl-6">
          {dp.elements.map((el, i) => (
            <li key={i} className="mb-1"><span className="font-medium">{el.name}:</span> {el.description}</li>
          ))}
        </ul>
        <h3 className="text-lg font-semibold mt-6 mb-2">Aligned Community Submissions</h3>
        {relatedSubmissions.length === 0 ? (
          <p className="text-gray-500">No submissions aligned to this property.</p>
        ) : (
          <ul className="space-y-3">
            {relatedSubmissions.map((sub, i) => (
              <li key={i}>
                <button 
                  className="text-blue-600 hover:underline font-medium" 
                  onClick={() => { 
                    console.log('Opening submission detail for:', sub.submission.title);
                    setSubmissionDetail(sub); 
                    setDpDetail(null); 
                  }}
                >
                  {sub.submission.title}
                </button>
                <div className="text-xs text-gray-500">By: {sub.submitter.first_name || ''} {sub.submitter.last_name || ''}</div>
                {/* Show clarifications/extensions for this DP from this submission */}
                <div className="ml-2 mt-1">
                  {sub.clarifications_and_extensions.filter(c => c.dp === dp.id || c.dp.includes(dp.name) || c.dp.includes(dp.id)).map((c, j) => (
                    <div key={j} className="text-sm mb-1">
                      <span className="font-semibold text-purple-700">{c.type}:</span> <span className="font-semibold">{c.title}</span>
                      <div className="text-gray-700 ml-2">
                        {c.clarification && <div><span className="italic">Clarification:</span> {c.clarification}</div>}
                        {c.extension && <div><span className="italic">Extension:</span> {c.extension}</div>}
                        <div className="text-xs text-purple-600">Why it matters: {c.why_it_matters}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // Submission Detail Modal
  const renderSubmissionDetail = (sub: Submission) => {
    console.log('renderSubmissionDetail called for:', sub.submission.title);
    return (
      <div>
        <h2 className="text-2xl font-bold mb-2">{sub.submission.title}</h2>
        <div className="text-sm text-gray-600 mb-2">By: {sub.submitter.first_name || ''} {sub.submitter.last_name || ''} {(!sub.submitter.first_name && !sub.submitter.last_name) && 'Anonymous'}</div>
        <p className="mb-4 text-gray-700">{sub.submission.overview}</p>
        <h3 className="text-lg font-semibold mt-6 mb-2">Alignments (Desirable Properties Addressed)</h3>
        <ul className="mb-4 list-disc pl-6">
          {sub.directly_addressed_dps.map((dp, i) => {
            const dpObj = getDPByIdOrName(dp.dp);
            return (
              <li key={i}>
                <button 
                  className="text-blue-600 hover:underline font-medium" 
                  onClick={() => { 
                    console.log('Opening DP detail for:', dp.dp);
                    if (dpObj) { 
                      setDpDetail(dpObj); 
                      setSubmissionDetail(null); 
                    } 
                  }}
                >
                  {dp.dp}
                </button>
                <span className="ml-2 text-gray-700">{dp.summary}</span>
              </li>
            );
          })}
        </ul>
        <h3 className="text-lg font-semibold mt-6 mb-2">Clarifications & Extensions</h3>
        <ul className="mb-4 list-disc pl-6">
          {sub.clarifications_and_extensions.map((c, i) => {
            const dpObj = getDPByIdOrName(c.dp);
            return (
              <li key={i}>
                <span className="font-semibold text-purple-700">{c.type}:</span> <span className="font-semibold">{c.title}</span>
                <span className="ml-2">(
                  <button 
                    className="text-blue-600 hover:underline" 
                    onClick={() => { 
                      console.log('Opening DP detail from clarification for:', c.dp);
                      if (dpObj) { 
                        setDpDetail(dpObj); 
                        setSubmissionDetail(null); 
                      } 
                    }}
                  >
                    {c.dp}
                  </button>
                )</span>
                <div className="text-gray-700 ml-2">
                  {c.clarification && <div><span className="italic">Clarification:</span> {c.clarification}</div>}
                  {c.extension && <div><span className="italic">Extension:</span> {c.extension}</div>}
                  <div className="text-xs text-purple-600">Why it matters: {c.why_it_matters}</div>
                </div>
              </li>
            );
          })}
        </ul>
        {sub.submission.source_link && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href={sub.submission.source_link}
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
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">{data?.meta.title}</h1>
          <p className="mt-2 text-lg text-gray-600">{data?.meta.description}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
            <span>Version: {data?.meta.version}</span>
            <span>Total Properties: {data?.meta.total_properties}</span>
            <span>Community Submissions: {submissions.length}</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Summary
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'properties'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Desirable Properties
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'submissions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              Community Submissions
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === 'properties' ? "Search properties..." : "Search submissions..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter - Only show for properties */}
            {activeTab === 'properties' && (
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Categories</option>
                  {data?.meta.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-gray-600">
            {activeTab === 'summary' 
              ? 'Overview and Statistics'
              : activeTab === 'properties'
              ? `Showing ${filteredProperties.length} of ${data?.meta.total_properties} properties`
              : `Showing ${filteredSubmissions.length} of ${submissions.length} submissions`
            }
          </p>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'summary' ? (
          <div className="space-y-6">
            {/* Overview Section */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Meta-Layer Initiative Overview</h2>
              <p className="text-gray-700 leading-relaxed mb-6">
                The Meta-Layer Initiative is a collaborative effort to define and implement the foundational 
                principles for a decentralized digital infrastructure that serves communities rather than corporations. 
                This platform showcases the 21 canonical Desirable Properties and community submissions that 
                address, support, extend, or clarify these properties.
              </p>
              
              {/* Six Buttons in One Row */}
              <div className="grid grid-cols-6 gap-4">
                <button 
                  onClick={() => setActiveTab('properties')}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow duration-200 text-center group"
                >
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {data?.meta.total_properties || 0}
                  </div>
                  <div className="text-sm text-gray-600">Desirable Properties</div>
                </button>

                <button 
                  onClick={() => setActiveTab('submissions')}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow duration-200 text-center group"
                >
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {submissions.length}
                  </div>
                  <div className="text-sm text-gray-600">Community Submissions</div>
                </button>

                <button 
                  onClick={() => setActiveTab('properties')}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow duration-200 text-center group"
                >
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {data?.meta.categories.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Property Categories</div>
                </button>

                <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-2">
                    {submissions.reduce((total, sub) => total + sub.directly_addressed_dps.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600"># of Alignments</div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {submissions.reduce((total, sub) => total + sub.clarifications_and_extensions.filter(ce => ce.type === 'Clarification').length, 0)}
                  </div>
                  <div className="text-sm text-gray-600"># of Clarifications</div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-2">
                    {submissions.reduce((total, sub) => total + sub.clarifications_and_extensions.filter(ce => ce.type === 'Extension').length, 0)}
                  </div>
                  <div className="text-sm text-gray-600"># of Extensions</div>
                </div>
              </div>
            </div>

            {/* Top DPs Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Most Aligned DPs */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Aligned DPs</h3>
                <div className="space-y-2">
                  {getTopDPs('alignments').slice(0, 10).map((dp) => (
                    <div key={dp.dp} className="flex justify-between items-center">
                      <button 
                        onClick={() => {
                          setActiveTab('properties');
                          setSearchTerm(dp.dp);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-left"
                      >
                        {dp.dp}
                      </button>
                      <span className="text-sm text-gray-500">{dp.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Clarifications */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Clarifications</h3>
                <div className="space-y-2">
                  {getTopDPs('clarifications').slice(0, 10).map((dp) => (
                    <div key={dp.dp} className="flex justify-between items-center">
                      <button 
                        onClick={() => {
                          setActiveTab('properties');
                          setSearchTerm(dp.dp);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-left"
                      >
                        {dp.dp}
                      </button>
                      <span className="text-sm text-gray-500">{dp.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Most Extensions */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Extensions</h3>
                <div className="space-y-2">
                  {getTopDPs('extensions').slice(0, 10).map((dp) => (
                    <div key={dp.dp} className="flex justify-between items-center">
                      <button 
                        onClick={() => {
                          setActiveTab('properties');
                          setSearchTerm(dp.dp);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline text-left"
                      >
                        {dp.dp}
                      </button>
                      <span className="text-sm text-gray-500">{dp.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Categories as Links */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Categories</h3>
              <div className="flex flex-wrap gap-4">
                {data?.meta.categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveTab('properties');
                      setSelectedCategory(category);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Community Activity in Reverse Order */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Community Activity</h3>
              <div className="space-y-3">
                {submissions.slice().reverse().slice(0, 5).map((submission, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{submission.submission.title}</div>
                      <div className="text-sm text-gray-600">
                        By {submission.submitter.first_name || ''} {submission.submitter.last_name || ''} 
                        {(!submission.submitter.first_name && !submission.submitter.last_name) && 'Anonymous'}
                      </div>
                    </div>
                    <button
                      onClick={() => setSubmissionDetail(submission)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'properties' ? (
          /* Properties List */
          <div className="space-y-4">
            {filteredProperties.map((property: DesirableProperty) => (
              <div key={property.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={() => {
                            console.log('DP title clicked:', property.name);
                            setDpDetail(property);
                          }}
                          className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {property.name}
                        </button>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {property.id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{property.category}</p>
                      <p className="text-gray-700 leading-relaxed">{property.description}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProperty(property.id);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedProperties.has(property.id) ? 
                        <ChevronUp className="h-5 w-5" /> : 
                        <ChevronDown className="h-5 w-5" />
                      }
                    </button>
                  </div>

                  {/* Expanded Elements */}
                  {expandedProperties.has(property.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Elements</h4>
                      <div className="space-y-4">
                        {property.elements.map((element, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-medium text-gray-900 mb-2">{element.name}</h5>
                            <p className="text-gray-700 text-sm leading-relaxed">{element.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Submissions List */
          <div className="space-y-4">
            {filteredSubmissions.map((submission: Submission, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <button 
                          onClick={() => {
                            console.log('Submission title clicked:', submission.submission.title);
                            setSubmissionDetail(submission);
                          }}
                          className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left"
                        >
                          {submission.submission.title}
                        </button>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          #{submission._metadata.file_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>
                          By: {submission.submitter.first_name || ''} {submission.submitter.last_name || ''} 
                          {(!submission.submitter.first_name && !submission.submitter.last_name) && 'Anonymous'}
                        </span>
                        <span>•</span>
                        <span>{submission.directly_addressed_dps.length} DPs addressed</span>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{submission.submission.overview}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubmission(submission._metadata.file_number);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {expandedSubmissions.has(submission._metadata.file_number) ? 
                        <ChevronUp className="h-5 w-5" /> : 
                        <ChevronDown className="h-5 w-5" />
                      }
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedSubmissions.has(submission._metadata.file_number) && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Directly Addressed DPs */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Directly Addressed DPs</h4>
                          <div className="space-y-3">
                            {submission.directly_addressed_dps.map((dp: { dp: string; summary: string }, dpIndex: number) => (
                              <div key={dpIndex} className="bg-blue-50 rounded-lg p-3">
                                <button 
                                  onClick={() => {
                                    console.log('DP reference clicked in submission:', dp.dp);
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
                            ))}
                          </div>
                        </div>

                        {/* Clarifications and Extensions */}
                        <div>
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Clarifications & Extensions</h4>
                          <div className="space-y-3">
                            {submission.clarifications_and_extensions.map((item: { dp: string; type: string; title: string; clarification?: string; extension?: string; why_it_matters: string }, itemIndex: number) => (
                              <div key={itemIndex} className="bg-purple-50 rounded-lg p-3">
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
                                      console.log('DP reference clicked in clarification:', item.dp);
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
                                {item.clarification && (
                                  <p className="text-purple-700 text-sm mb-2">{item.clarification}</p>
                                )}
                                {item.extension && (
                                  <p className="text-purple-700 text-sm mb-2">{item.extension}</p>
                                )}
                                <p className="text-purple-600 text-xs italic">Why it matters: {item.why_it_matters}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Source Link */}
                      {submission.submission.source_link && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <a
                            href={submission.submission.source_link}
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
        )}

        {/* No Results */}
        {((activeTab === 'properties' && filteredProperties.length === 0) || 
          (activeTab === 'submissions' && filteredSubmissions.length === 0)) && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No {activeTab === 'properties' ? 'properties' : 'submissions'} found matching your criteria.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-600">
              Meta-Layer Desirable Properties • Version {data?.meta.version}
            </p>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <a
                href="https://github.com/meta-layer/desirable-properties"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
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
        console.log('Closing DP detail modal');
        setDpDetail(null);
      }}>
        {dpDetail && renderDPDetail(dpDetail)}
      </Modal>
      <Modal open={!!submissionDetail} onClose={() => {
        console.log('Closing submission detail modal');
        setSubmissionDetail(null);
      }}>
        {submissionDetail && renderSubmissionDetail(submissionDetail)}
      </Modal>
    </div>
  );
}
