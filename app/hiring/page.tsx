'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, Briefcase, UserCheck, Play, ArrowRight, ShieldCheck, 
  ExternalLink, Check, X, Calendar, ClipboardCheck, Award, FileText
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

// Local Mock Database structured from the original data.js file
const CANDIDATES = [
  {
    id: "c001",
    name: "Rahul Sharma",
    role: "Senior Frontend Developer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150",
    matchScore: 96,
    salary: "₹14–18 LPA",
    experience: "5 years",
    currentCompany: "Razorpay",
    availability: "Immediate",
    location: "Bangalore",
    noticePeriod: "0 days",
    startupExp: true,
    email: "rahul.sharma@email.com",
    phone: "+91 98765 43210",
    skills: ["React", "Next.js", "TypeScript", "Node.js", "MongoDB", "AWS", "Redux", "Tailwind", "Jest", "Docker"],
    missingSkills: ["GraphQL"],
    bonusSkills: ["Figma", "Cypress", "Storybook"],
    communicationScore: 92,
    technicalScore: 95,
    leadershipScore: 88,
    cultureScore: 90,
    aiConfidence: 96,
    hiringRisk: "Low",
    aiSummary: "Rahul is an exceptional frontend engineer with deep React expertise and proven startup experience at Razorpay. His immediate availability, strong communication skills, and track record of shipping at scale make him the top candidate for this role.",
    strengths: ["Strong React & TypeScript fundamentals", "Led 3-person frontend team at Razorpay", "Active open-source contributor (800+ GitHub stars)", "Excellent problem-solving under pressure"],
    weaknesses: ["Limited GraphQL experience", "No DevOps background"],
    resumeSummary: "5+ years building scalable frontend systems for fintech and SaaS products. Built payment dashboard handling ₹500Cr+ transactions at Razorpay.",
    education: [{ degree: "B.Tech Computer Science", institution: "IIT Bombay", year: "2019", grade: "8.5 CGPA" }],
    certifications: ["AWS Certified Developer", "Google Cloud Professional"],
    experienceList: [
      { role: "Senior Frontend Developer", company: "Razorpay", duration: "Jan 2022 – Present", desc: "Led frontend for payment dashboard. Built component library used across 6 products." },
      { role: "Frontend Developer", company: "Swiggy", duration: "Jun 2020 – Dec 2021", desc: "Built restaurant portal serving 150K+ restaurants." },
      { role: "Junior Developer", company: "Infosys", duration: "Aug 2019 – May 2020", desc: "Worked on enterprise React applications." }
    ],
    status: "screening"
  },
  {
    id: "c002",
    name: "Priya Patel",
    role: "AI/ML Engineer",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150",
    matchScore: 94,
    salary: "₹20–25 LPA",
    experience: "4 years",
    currentCompany: "Google DeepMind",
    availability: "30 days",
    location: "Hyderabad",
    noticePeriod: "30 days",
    startupExp: false,
    email: "priya.patel@email.com",
    phone: "+91 87654 32109",
    skills: ["Python", "TensorFlow", "PyTorch", "FastAPI", "AWS", "Kubernetes", "LLMs", "RAG", "LangChain"],
    missingSkills: ["React"],
    bonusSkills: ["Research Publications", "MLOps"],
    communicationScore: 88,
    technicalScore: 97,
    leadershipScore: 82,
    cultureScore: 85,
    aiConfidence: 94,
    hiringRisk: "Low",
    aiSummary: "Priya is a world-class ML engineer from Google DeepMind with LLM and RAG expertise directly relevant to your AI product. Her 30-day notice is the only friction — otherwise a near-perfect match.",
    strengths: ["Deep LLM & RAG expertise", "Published ML research (3 papers)", "Google-scale system design experience"],
    weaknesses: ["No startup experience", "30-day notice period"],
    resumeSummary: "ML Engineer at Google DeepMind working on large language models and production AI systems serving millions of users globally.",
    education: [{ degree: "M.Tech AI & ML", institution: "IIT Delhi", year: "2020", grade: "9.1 CGPA" }],
    certifications: ["Google Professional ML Engineer", "Deep Learning Specialization"],
    experienceList: [
      { role: "ML Engineer", company: "Google DeepMind", duration: "Mar 2022 – Present", desc: "Working on LLM fine-tuning pipelines." },
      { role: "Data Scientist", company: "Flipkart", duration: "Jul 2020 – Feb 2022", desc: "Built recommendation systems." }
    ],
    status: "interview"
  },
  {
    id: "c003",
    name: "Aman Singh",
    role: "Full Stack Developer",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150",
    matchScore: 89,
    salary: "₹12–16 LPA",
    experience: "3 years",
    currentCompany: "Zepto",
    availability: "15 days",
    location: "Delhi",
    noticePeriod: "15 days",
    startupExp: true,
    email: "aman.singh@email.com",
    phone: "+91 76543 21098",
    skills: ["React", "Node.js", "MongoDB", "Express", "Vue.js", "Python", "PostgreSQL", "Redis"],
    missingSkills: ["TypeScript", "AWS"],
    bonusSkills: ["React Native", "GraphQL"],
    communicationScore: 85,
    technicalScore: 88,
    leadershipScore: 75,
    cultureScore: 92,
    aiConfidence: 89,
    hiringRisk: "Low",
    aiSummary: "Aman is a solid MERN stack developer with hands-on startup experience at Zepto. Strong culture fit and quick availability make him an excellent choice for a growing team.",
    strengths: ["MERN stack mastery", "Startup-proven execution speed", "Strong culture fit"],
    weaknesses: ["Limited TypeScript experience", "No AWS certification"],
    resumeSummary: "Full-stack developer building high-performance grocery delivery systems at Zepto, handling 500K+ daily orders.",
    education: [{ degree: "B.E. Computer Engineering", institution: "BITS Pilani", year: "2021", grade: "8.0 CGPA" }],
    certifications: ["MongoDB Developer", "Node.js Certification"],
    experienceList: [
      { role: "Full Stack Developer", company: "Zepto", duration: "Aug 2021 – Present", desc: "Building microservices for grocery delivery." }
    ],
    status: "offer"
  }
];

const JOBS = [
  { id: "j001", title: "Frontend Developer", stack: ["React", "TypeScript", "Next.js"], dept: "Engineering", applicants: 24, progress: 65, status: "Interview Stage", openSince: "12 days", priority: "High" },
  { id: "j002", title: "AI Engineer", stack: ["Python", "LLMs", "FastAPI"], dept: "AI", applicants: 41, progress: 40, status: "Technical Round", openSince: "8 days", priority: "Critical" },
  { id: "j003", title: "UI/UX Designer", stack: ["Figma", "Prototyping"], dept: "Design", applicants: 18, progress: 25, status: "Screening", openSince: "5 days", priority: "Medium" }
];

const AI_SOURCES = [
  { name: "LinkedIn", icon: "💼", found: 18 },
  { name: "GitHub", icon: "💻", found: 9 },
  { name: "LeetCode", icon: "📊", found: 6 },
  { name: "HackerRank", icon: "🏆", found: 4 },
  { name: "Internal ATS", icon: "🗄️", found: 12 },
  { name: "Resume DB", icon: "📁", found: 23 }
];

type ActionCard = {
  id: string;
  agentUsed: 'finance' | 'hiring' | 'legal' | 'gtm';
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
};

export default function HiringPage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results panel view configurations
  const [showResults, setShowResults] = useState(false);
  const [resultsTab, setResultsTab] = useState<'results' | 'rec' | 'compare' | 'sources'>('results');
  
  // Selected candidate profile slide-over panel
  const [selectedCandidate, setSelectedCandidate] = useState<typeof CANDIDATES[0] | null>(null);
  const [profileTab, setProfileTab] = useState<'ai' | 'resume' | 'skills' | 'exp'>('ai');

  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      const { data: profile } = await supabase
        .from('founder_profile')
        .select('*')
        .eq('id', FOUNDER_ID)
        .single();

      const res = await fetch('/api/agent/hiring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: userMessage,
          extractedContext: userMessage,
          founderProfile: profile || {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      await fetchHiringActions();
      setShowResults(true); // Reveal results search section after search completed
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-xl font-bold tracking-tight text-neutral-50">Hiring Command</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Automated screening, search orchestration, and talent matching</p>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-10">
        {/* Chat input card (Action trigger center) */}
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
              className="rounded-xl bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-50"
            >
              Ask AI
            </button>
          </form>

          {/* Quick chips templates */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setMessage('Hire a Senior React Developer for our SaaS startup')}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              🚀 Hire React Dev
            </button>
            <button
              onClick={() => setMessage('Find AI Engineers with LLM experience')}
              className="rounded-full border border-neutral-800 bg-neutral-950 px-3.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            >
              🤖 Find AI Engineers
            </button>
            <button
              onClick={() => setMessage('Generate a job description for a Full Stack Developer')}
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

        {/* ── CONDITIONAL RENDER: Candidate Matches & Results ── */}
        {showResults && (
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 overflow-hidden">
            {/* Results Tabs */}
            <div className="flex border-b border-neutral-800 bg-neutral-950/40 px-6">
              {[
                { id: 'results', label: '📋 Top Candidates' },
                { id: 'rec', label: '🤖 AI Recommended' },
                { id: 'compare', label: '⚖️ Candidate Comparison' },
                { id: 'sources', label: '🔍 AI Sources' }
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

            {/* Results Tab Panels */}
            <div className="p-6">
              {resultsTab === 'results' && (
                <div className="space-y-4">
                  <div className="grid gap-3">
                    {CANDIDATES.map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => {
                          setSelectedCandidate(cand);
                          setProfileTab('ai');
                        }}
                        className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/40 p-4 hover:border-neutral-700 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <img className="h-11 w-11 rounded-lg object-cover" src={cand.avatar} alt={cand.name} />
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
                          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            {cand.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resultsTab === 'rec' && (
                <div className="space-y-4">
                  {CANDIDATES.slice(0, 1).map((c) => (
                    <div key={c.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-neutral-850 pb-4">
                        <div className="flex items-center gap-4">
                          <img className="h-14 w-14 rounded-xl object-cover" src={c.avatar} alt={c.name} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-neutral-200">{c.name}</h3>
                              <span className="rounded bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-950 uppercase tracking-wider">
                                AI PICK #1
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

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Strengths</h4>
                            <ul className="space-y-1.5">
                              {c.strengths.map((str, i) => (
                                <li key={i} className="text-xs text-neutral-400 flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Weaknesses</h4>
                            <ul className="space-y-1.5">
                              {c.weaknesses.map((wk, i) => (
                                <li key={i} className="text-xs text-neutral-400 flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">⚠️</span>
                                  <span>{wk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
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
                        <th className="p-3 font-semibold text-neutral-500">Hiring Risk</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {CANDIDATES.map((cand) => (
                        <tr key={cand.id} className="hover:bg-neutral-900/10">
                          <td className="p-3 font-semibold text-neutral-200">{cand.name}</td>
                          <td className="p-3">
                            <span className="text-green-400 font-bold">{cand.matchScore}%</span>
                          </td>
                          <td className="p-3 text-neutral-400">{cand.experience}</td>
                          <td className="p-3 text-neutral-400 truncate max-w-[200px]">{cand.skills.slice(0,4).join(', ')}</td>
                          <td className="p-3 text-neutral-400">{cand.availability}</td>
                          <td className="p-3">
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                              {cand.hiringRisk}
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

        {/* ── Active Jobs Section ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            💼 Current Openings
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {JOBS.map((job) => (
              <div key={job.id} className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-400 border border-red-500/20">
                      {job.priority}
                    </span>
                    <span className="text-[10px] text-neutral-500">{job.openSince}</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-200 mt-2">{job.title}</h3>
                  <p className="text-[10px] text-neutral-500">{job.dept}</p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {job.stack.map((s, i) => (
                    <span key={i} className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-400 border border-neutral-800">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-neutral-850 pt-3">
                  <span className="text-xs text-neutral-400">{job.applicants} Applicants</span>
                  <span className="text-xs text-neutral-500 font-semibold">{job.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Actions List Feed ── */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            📋 Generated Hiring Assets
          </h2>
          {actions.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-sm text-neutral-500">
              No hiring actions drafted yet. Ask the agent to generate job descriptions above.
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((card) => (
                <div
                  key={card.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 space-y-4 shadow-sm hover:border-neutral-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Hiring
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(card.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs italic text-neutral-500">Prompt: "{card.inputMessage}"</div>

                  <h3 className="text-sm font-bold text-neutral-250 leading-snug">
                    {card.draft ? card.draft.split('\n')[0].replace(/^#+\s*/, '') : 'Draft'}
                  </h3>

                  <div className="whitespace-pre-line text-sm leading-relaxed text-neutral-300">
                    {card.draft}
                  </div>

                  {card.requiresApproval && (
                    <div className="mt-4 border-t border-neutral-800/80 pt-4 flex items-center justify-between">
                      {card.status === 'pending' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(card.id, 'approved')}
                            className="rounded-lg bg-neutral-100 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(card.id, 'rejected')}
                            className="rounded-lg border border-neutral-800 bg-transparent px-3.5 py-1.5 text-xs font-semibold text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900/40 transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : card.status === 'approved' ? (
                        <span className="inline-flex items-center rounded bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400 border border-green-500/20">
                          ✓ Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
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
                <img className="h-16 w-16 rounded-xl object-cover" src={selectedCandidate.avatar} alt={selectedCandidate.name} />
                <div>
                  <h2 className="text-lg font-bold text-neutral-200">{selectedCandidate.name}</h2>
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
                  { id: 'resume', label: 'Resume' },
                  { id: 'skills', label: 'Skills' },
                  { id: 'exp', label: 'Experience' }
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
                        <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">Hiring Risk</div>
                      </div>
                      <div className="rounded-xl border border-neutral-800 bg-neutral-950/20 p-4 text-center">
                        <div className="text-xs font-bold text-neutral-200">{selectedCandidate.aiConfidence}%</div>
                        <div className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">AI Confidence</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Strengths</h4>
                      <ul className="space-y-1.5">
                        {selectedCandidate.strengths.map((str, i) => (
                          <li key={i} className="text-xs text-neutral-400 flex items-start gap-2">
                            <span className="text-green-400 font-bold mt-0.5">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {profileTab === 'resume' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-4 space-y-2">
                      <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Resume Summary</div>
                      <p className="text-xs leading-relaxed text-neutral-350">{selectedCandidate.resumeSummary}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-neutral-200">Contact Details</div>
                      <div className="text-xs text-neutral-400">Email: {selectedCandidate.email}</div>
                      <div className="text-xs text-neutral-400">Phone: {selectedCandidate.phone}</div>
                    </div>
                  </div>
                )}

                {profileTab === 'skills' && (
                  <div className="space-y-4">
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
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">Missing Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidate.missingSkills.map((s, i) => (
                          <span key={i} className="rounded bg-red-500/10 px-2.5 py-0.5 text-xs text-red-400 border border-red-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {profileTab === 'exp' && (
                  <div className="space-y-4">
                    {selectedCandidate.experienceList.map((exp, i) => (
                      <div key={i} className="border-l-2 border-neutral-850 pl-4 py-1">
                        <div className="text-xs font-semibold text-neutral-200">{exp.role}</div>
                        <div className="text-[11px] text-neutral-500">{exp.company} · {exp.duration}</div>
                        <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{exp.desc}</p>
                      </div>
                    ))}
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
