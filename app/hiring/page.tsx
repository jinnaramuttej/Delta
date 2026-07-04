'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Briefcase, UserCheck, Play, ArrowRight, ShieldCheck, 
  ExternalLink, Check, X, Calendar, ClipboardCheck, Award, FileText, Info
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type Candidate = {
  name: string;
  role: string;
  experience: string;
  matchScore: number;
  skills: string[];
  availability: string;
  currentCompany: string;
  aiSummary: string;
  hiringRisk: string;
};

type ActionCard = {
  id: string;
  agentUsed: 'finance' | 'hiring' | 'legal' | 'gtm';
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
};

const AI_SOURCES = [
  { name: "LinkedIn", icon: "💼", found: 18 },
  { name: "GitHub", icon: "💻", found: 9 },
  { name: "LeetCode", icon: "📊", found: 6 },
  { name: "HackerRank", icon: "🏆", found: 4 },
  { name: "Internal ATS", icon: "🗄️", found: 12 },
  { name: "Resume DB", icon: "📁", found: 23 }
];

export default function HiringPage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Candidates generated via Ollama model calls
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [resultsTab, setResultsTab] = useState<'results' | 'rec' | 'compare' | 'sources'>('results');
  
  // Selected candidate profile slide-over panel
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [profileTab, setProfileTab] = useState<'ai' | 'skills'>('ai');

  const fetchHiringActions = async () => {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'hiring')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: ActionCard[] = data.map((row) => ({
        id: row.id,
        agentUsed: row.agent_type as any,
        inputMessage: row.input_message,
        draft: (row.output_draft as { text?: string })?.text ?? '',
        requiresApproval: row.requires_approval,
        status: row.status,
        createdAt: row.created_at,
      }));
      setActions(mapped);
    }
  };

  useEffect(() => {
    fetchHiringActions();
  }, []);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      const { data: profile } = await supabase
        .from('founder_profile')
        .select('*')
        .eq('id', FOUNDER_ID)
        .single();

      // 1. Send the primary agent request
      const res = await fetch('/api/agent/hiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: queryText,
          extractedContext: queryText,
          founderProfile: profile || {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      // 2. Fetch 3 dynamic simulated candidate profiles from Ollama
      try {
        const ollamaRes = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen3:8b',
            prompt: `You are a startup HR matches generator. Generate exactly 3 realistic but clearly fictional example candidate profiles for this hiring role: "${queryText}". Return ONLY a raw JSON array matching this typescript shape: Array<{ name: string, role: string, experience: string, matchScore: number, skills: string[], availability: string, currentCompany: string, aiSummary: string, hiringRisk: 'Low' | 'Medium' | 'High' }>. Do not include markdown code block formatting or explanation, just the raw JSON.`,
            stream: false,
            options: { temperature: 0.1 },
            think: false
          })
        });

        if (ollamaRes.ok) {
          const rawText = (await ollamaRes.json()).response;
          const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanedText);
          if (Array.isArray(parsed)) {
            setCandidates(parsed);
          }
        }
      } catch (simErr) {
        console.error("Failed to generate dynamic simulator matches:", simErr);
      }

      await fetchHiringActions();
      setShowResults(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(message);
    setMessage('');
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('id', id);

      if (!error) {
        setActions((prev) =>
          prev.map((card) => (card.id === id ? { ...card, status: nextStatus } : card))
        );
      }
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const getInitials = (fullName: string) => {
    return fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-xl font-bold tracking-tight text-neutral-50">Hiring Command</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Automated screening, search orchestration, and talent matching</p>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-10">
        {/* Query Input Card */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-2">
            <span>✨</span> Query Agent
          </h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask hiring agent to recruit, generate job descriptions, screen developers..."
              disabled={loading}
              className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 transition focus:border-neutral-700 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="rounded-xl bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-50 min-w-[90px]"
            >
              {loading ? 'Asking...' : 'Ask AI'}
            </button>
          </form>

          {/* Quick templates (auto-triggers action on click) */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => handleQuery('Hire a Senior React Developer for our SaaS startup')}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              🚀 Hire React Dev
            </button>
            <button
              onClick={() => handleQuery('Find AI Engineers with LLM experience')}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              🤖 Find AI Engineers
            </button>
            <button
              onClick={() => handleQuery('Generate a job description for a Full Stack Developer')}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              📝 Generate JD
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex items-center justify-center py-10">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-neutral-300">Searching platforms & matching resumes...</p>
              <p className="text-xs text-neutral-500">Classification routed to Hiring Agent</p>
            </div>
          </div>
        )}

        {/* ── Simulated Candidate Matches with warning tags ── */}
        {showResults && candidates.length > 0 && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 overflow-hidden">
            <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6 justify-between items-center pr-6">
              <div className="flex">
                {[
                  { id: 'results', label: '📋 Simulated Matches' },
                  { id: 'rec', label: '🤖 AI Top Choice' },
                  { id: 'compare', label: '⚖️ Side-by-Side' },
                  { id: 'sources', label: '🔍 Platforms searched' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setResultsTab(tab.id as any)}
                    className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition ${
                      resultsTab === tab.id
                        ? 'border-neutral-100 text-neutral-100'
                        : 'border-transparent text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-2 py-1 text-[10px] font-medium text-neutral-400 border border-neutral-800" title="These candidates are simulated placeholders generated by the LLM.">
                <Info className="h-3.5 w-3.5 text-neutral-400" /> Demo data — not real candidates
              </span>
            </div>

            <div className="p-6">
              {resultsTab === 'results' && (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {candidates.map((cand, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setProfileTab('ai');
                        }}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 hover:border-neutral-700 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-11 w-11 rounded-lg bg-neutral-800 border border-neutral-750 flex items-center justify-center text-xs font-bold text-neutral-300">
                            {getInitials(cand.name)}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-neutral-200">{cand.name}</h4>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {cand.role} · {cand.currentCompany} · {cand.availability}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border ${
                            cand.matchScore >= 90
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {cand.matchScore}%
                          </div>
                          <span className="text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
                            {cand.experience} exp
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultsTab === 'rec' && (
                <div className="space-y-4">
                  {candidates.slice(0, 1).map((c, i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-xl bg-neutral-800 border border-neutral-750 flex items-center justify-center text-sm font-bold text-neutral-300">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-neutral-200">{c.name}</h3>
                              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-950 uppercase tracking-wider">
                                AI RECOMMENDED
                              </span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                              {c.role} · {c.currentCompany}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-400">{c.matchScore}% Match</div>
                          <div className="text-xs text-neutral-500 mt-0.5">{c.availability}</div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">AI Assessment</h4>
                          <p className="text-sm leading-relaxed text-neutral-300">{c.aiSummary}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {resultsTab === 'compare' && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-950/20">
                        <th className="p-3 font-semibold text-neutral-500">Candidate</th>
                        <th className="p-3 font-semibold text-neutral-500">Match Score</th>
                        <th className="p-3 font-semibold text-neutral-500">Experience</th>
                        <th className="p-3 font-semibold text-neutral-500">Key Skills</th>
                        <th className="p-3 font-semibold text-neutral-500">Availability</th>
                        <th className="p-3 font-semibold text-neutral-500">Risk Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {candidates.map((cand, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/10">
                          <td className="p-3 font-semibold text-neutral-200">{cand.name}</td>
                          <td className="p-3">
                            <span className="text-green-400 font-bold">{cand.matchScore}%</span>
                          </td>
                          <td className="p-3 text-neutral-400">{cand.experience}</td>
                          <td className="p-3 text-neutral-400 truncate max-w-[200px]">{cand.skills.join(', ')}</td>
                          <td className="p-3 text-neutral-400">{cand.availability}</td>
                          <td className="p-3">
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-450">
                              {cand.hiringRisk} Risk
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {resultsTab === 'sources' && (
                <div className="grid gap-3 sm:grid-cols-3">
                  {AI_SOURCES.map((source, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{source.icon}</span>
                        <span className="text-xs font-semibold text-neutral-200">{source.name}</span>
                      </div>
                      <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-bold text-neutral-400">
                        {source.found}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Active Jobs Section (Derived from real agent actions) ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            💼 Current Openings
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {actions.slice(0, 3).map((job) => {
              const parsedTitle = job.draft.split('\n')[0].replace(/^#+\s*/, '') || 'Hiring Request';
              return (
                <div key={job.id} className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-500/20">
                        Active Opening
                      </span>
                      <span className="text-[10px] text-neutral-500">{new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h3 className="text-sm font-bold text-neutral-250 mt-2 truncate">{parsedTitle}</h3>
                    <p className="text-[10px] text-neutral-500 mt-1">Status: {job.status}</p>
                  </div>
                </div>
              );
            })}
            {actions.length === 0 && (
              <div className="col-span-3 rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-sm text-neutral-500">
                No active openings on record. Generate a job description to populate.
              </div>
            )}
          </div>
        </section>

      </div>

      {/* ── Slide-Over Candidate Profile Drawer ── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="relative flex h-full w-full max-w-lg flex-col bg-neutral-950 border-l border-neutral-800 p-8 shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-6">
              <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                <span>👤</span> Candidate Profile
              </h3>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 transition"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Profile Hero */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-neutral-800 border border-neutral-750 flex items-center justify-center text-lg font-bold text-neutral-350">
                  {getInitials(selectedCandidate.name)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-250">{selectedCandidate.name}</h2>
                  <p className="text-xs text-neutral-500 mt-1">
                    {selectedCandidate.role} · {selectedCandidate.currentCompany}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="rounded bg-green-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-green-400 border border-green-500/20">
                      {selectedCandidate.matchScore}% Match
                    </span>
                    <span className="rounded bg-neutral-800 px-2.5 py-0.5 text-[10px] text-neutral-400">
                      {selectedCandidate.availability}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex border-b border-neutral-800">
                {[
                  { id: 'ai', label: 'AI Analysis' },
                  { id: 'skills', label: 'Skills' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileTab(tab.id as any)}
                    className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition ${
                      profileTab === tab.id
                        ? 'border-neutral-100 text-neutral-100'
                        : 'border-transparent text-neutral-500 hover:text-neutral-350'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Drawer Tab Content */}
              <div>
                {profileTab === 'ai' && (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-4 space-y-2">
                      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">AI Summary</div>
                      <p className="text-xs leading-relaxed text-neutral-350">{selectedCandidate.aiSummary}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/20 p-4 text-center">
                        <div className="text-xs font-bold text-neutral-200">{selectedCandidate.hiringRisk}</div>
                        <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Risk Level</div>
                      </div>
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/20 p-4 text-center">
                        <div className="text-xs font-bold text-neutral-200">{selectedCandidate.experience}</div>
                        <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Experience</div>
                      </div>
                    </div>
                  </div>
                )}

                {profileTab === 'skills' && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Skills Match</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.skills.map((s, i) => (
                        <span key={i} className="rounded bg-green-500/10 px-2.5 py-0.5 text-xs text-green-400 border border-green-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
