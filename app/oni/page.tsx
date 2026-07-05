'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Sparkles, Paperclip, Mic, ArrowUp, ImageIcon, DollarSign, FileText, Megaphone, Sun, Info, X, Mail } from 'lucide-react';
import Strands from '@/components/Strands';

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

type Message = {
  id: string;
  sender: 'user' | 'oni';
  text: string;
  agentUsed?: 'hiring' | 'finance' | 'legal' | 'gtm';
  requiresApproval?: boolean;
  status?: string;
  candidatesList?: Candidate[];
  candidatesLoading?: boolean;
  actionId?: string;
};

const ONI_CHAT_KEY = 'oni_chat_history';

export default function OniPage() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Hydrate from localStorage on first render
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(ONI_CHAT_KEY);
      return saved ? (JSON.parse(saved) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(ONI_CHAT_KEY);
      const msgs = saved ? (JSON.parse(saved) as Message[]) : [];
      return msgs.length > 0;
    } catch { return false; }
  });
  const [founderName, setFounderName] = useState('');
  const [founderProfile, setFounderProfile] = useState<{ name: string; startup_name: string } | null>(null);
  const [greeting, setGreeting] = useState('Hello');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [profileTab, setProfileTab] = useState<'ai' | 'skills'>('ai');
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCandidateName, setEmailCandidateName] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const clearChat = () => {
    localStorage.removeItem(ONI_CHAT_KEY);
    setMessages([]);
    setHasStarted(false);
  };

  const badgeClasses: Record<string, string> = {
    hiring: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    finance: 'bg-green-500/10 text-green-400 border border-green-500/20',
    legal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    gtm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  useEffect(() => {
    // 1. Fetch founder profile name & startup name
    async function fetchFounder() {
      const { data, error } = await supabase
        .from('founder_profile')
        .select('name, startup_name')
        .eq('id', FOUNDER_ID)
        .single();
      if (!error && data) {
        setFounderName(data.name);
        setFounderProfile(data);
      }
    }
    fetchFounder();

    // 2. Compute greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(ONI_CHAT_KEY, JSON.stringify(messages)); } catch { /* quota exceeded */ }
    }
  }, [messages]);

  const handleEmailCandidateDirect = async (candidate: Candidate) => {
    const nameParts = candidate.name.trim().split(/\s+/);
    const firstName = nameParts[0] ? nameParts[0].toLowerCase() : 'candidate';
    const lastName = nameParts[nameParts.length - 1] && nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : '';
    const to = lastName ? `${firstName}.${lastName}@example-candidate.com` : `${firstName}@example-candidate.com`;
    
    const startupName = founderProfile?.startup_name || 'our startup';
    const subject = `Opportunity: ${candidate.role} at ${startupName}`;
    
    // Fetch the most recent approved JD draft from DB
    let mostRecentApprovedJD = null;
    try {
      const { data, error } = await supabase
        .from('agent_actions')
        .select('output_draft')
        .eq('founder_id', FOUNDER_ID)
        .eq('agent_type', 'hiring')
        .in('status', ['approved', 'posted', 'contacted'])
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (!error && data && data.length > 0) {
        mostRecentApprovedJD = (data[0].output_draft as { text?: string })?.text ?? null;
      }
    } catch (e) {
      console.error(e);
    }
    
    const jdText = mostRecentApprovedJD 
      ? `Here is the job description:\n\n${mostRecentApprovedJD}`
      : `We are looking for someone with your background to join our team and help us build the next generation of our product.`;
      
    const bodyText = `Hi ${candidate.name},\n\nWe came across your profile and think you'd be a great fit for our ${candidate.role} position at ${startupName}.\n\n${jdText}\n\nLooking forward to connecting.\n\nBest,\n${founderProfile?.name || founderName || 'Founder'}`;
    
    setEmailTo(to);
    setEmailSubject(subject);
    setEmailBody(bodyText);
    setEmailCandidateName(candidate.name);
    setEmailModalOpen(true);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      showToast('🎙️ Listening...');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      showToast(`❌ Error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setInput('');
    setHasStarted(true);

    const userMsgId = Math.random().toString();
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: queryText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: FOUNDER_ID, message: queryText }),
      });

      if (!res.ok) {
        throw new Error('Orchestration query failed');
      }

      const data = await res.json();
      
      let actionId = '';
      const { data: recentActions } = await supabase
        .from('agent_actions')
        .select('id')
        .eq('founder_id', FOUNDER_ID)
        .eq('agent_type', data.agentUsed || 'hiring')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentActions && recentActions.length > 0) {
        actionId = recentActions[0].id;
      }

      const oniMsgId = data.id || Math.random().toString();
      const isHiring = data.agentUsed === 'hiring';

      // Insert the response immediately so user sees the draft
      setMessages((prev) => [
        ...prev,
        {
          id: oniMsgId,
          sender: 'oni',
          text: data.draft || data.summary || 'Task completed by Agent.',
          agentUsed: data.agentUsed,
          requiresApproval: data.requiresApproval,
          status: data.status || 'pending',
          candidatesLoading: isHiring,
          actionId: actionId || data.id,
        },
      ]);
      setLoading(false);

      if (isHiring) {
        // Fetch candidates in the background
        (async () => {
          let candidatesList: Candidate[] = [];
          try {
            const modelName = 'qwen3:8b';
            const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: modelName,
                prompt: `/no_think Generate exactly 3 realistic but clearly fictional example candidate profiles for this hiring role: "${queryText}". Return ONLY a raw JSON array matching this typescript shape: Array<{ name: string, role: string, experience: string, matchScore: number, skills: string[], availability: string, currentCompany: string, aiSummary: string, hiringRisk: 'Low' | 'Medium' | 'High' }>. Do not include markdown code block formatting or explanation, just the raw JSON.`,
                stream: false,
                options: { temperature: 0.1, num_predict: 800 },
              }),
              signal: AbortSignal.timeout(60000)
            });

            if (ollamaRes.ok) {
              const rawText = (await ollamaRes.json()).response;

              // Step 1: Strip all markdown fence variants
              const stripped = rawText
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

              // Step 2: Extract the first [...] array block
              const arrayMatch = stripped.match(/\[[\s\S]*\]/);
              const cleanedText = arrayMatch ? arrayMatch[0] : stripped;

              // Step 3: Attempt repair of common model hallucinations
              let repairedText = cleanedText
                .replace(/"?name\d+"?\s*:/g, '"name":')
                .replace(/"?role\d+"?\s*:/g, '"role":')
                .replace(/"?skills\d+"?\s*:/g, '"skills":')
                .replace(/"?experience\d+"?\s*:/g, '"experience":')
                .replace(/"?matchScore\d+"?\s*:/g, '"matchScore":')
                .replace(/"?availability\d+"?\s*:/g, '"availability":')
                .replace(/"?currentCompany\d+"?\s*:/g, '"currentCompany":')
                .replace(/"?aiSummary\d+"?\s*:/g, '"aiSummary":')
                .replace(/"?hiringRisk\d+"?\s*:/g, '"hiringRisk":');

              repairedText = repairedText.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ");

              try {
                const parsed = JSON.parse(repairedText);
                if (Array.isArray(parsed)) {
                  candidatesList = parsed.filter(
                    (c: Candidate) => typeof c?.name === 'string' && c.name.trim().length > 0
                  );
                }
              } catch (jsonErr) {
                console.error("[oni] JSON parsing failed for raw Ollama response. Raw Output was:", rawText);
              }
            }
          } catch (simErr) {
            console.error("Failed to generate dynamic simulator matches in Oni Page:", simErr);
          }

          if (candidatesList.length === 0) {
            candidatesList = [
              {
                name: "Aarav Sharma",
                role: "Backend Engineer",
                experience: "4 years",
                matchScore: 94,
                skills: ["Node.js", "Express", "MongoDB", "TypeScript"],
                availability: "Immediate",
                currentCompany: "TechSolutions",
                aiSummary: "Strong backend specialist with extensive experience building REST APIs, managing database clusters, and scaling microservices.",
                hiringRisk: "Low"
              },
              {
                name: "Priya Patel",
                role: "Senior Backend Developer",
                experience: "6 years",
                matchScore: 89,
                skills: ["Python", "Django", "PostgreSQL", "AWS"],
                availability: "2 weeks notice",
                currentCompany: "ScaleUp Systems",
                aiSummary: "Senior engineer specializing in cloud architecture, database query optimizations, and secure systems engineering.",
                hiringRisk: "Low"
              },
              {
                name: "Rohan Das",
                role: "Fullstack Eng (Backend Focused)",
                experience: "3 years",
                matchScore: 82,
                skills: ["Node.js", "React", "PostgreSQL", "Docker"],
                availability: "Immediate",
                currentCompany: "Freelance / Self-employed",
                aiSummary: "Versatile engineer with clean coding practices, solid system integration knowledge, and robust containerization habits.",
                hiringRisk: "Medium"
              }
            ];
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === oniMsgId
                ? { ...m, candidatesList, candidatesLoading: false }
                : m
            )
          );
        })();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: Math.random().toString(), sender: 'oni', text: 'Sorry, I encountered an error coordinating with the orchestrator.' },
      ]);
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleQuery(input);
  };

  const handleUpdateStatus = async (messageId: string, actionId: string, nextStatus: 'approved' | 'rejected') => {
    const targetId = actionId || messageId;
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: nextStatus, approved: nextStatus === 'approved' })
        .eq('id', targetId);

      if (!error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId || m.actionId === targetId ? { ...m, status: nextStatus } : m))
        );
      }
    } catch (err: any) {
      alert(`Action update failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden relative">
      {/* WebGL strands background animation */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <Strands
          colors={['#FF4242', '#7C3AED', '#06B6D4', '#EAB308']}
          count={5}
          speed={0.3}
          amplitude={0.8}
          thickness={0.5}
          glow={2.0}
        />
      </div>

      {/* Clear chat button — only visible when history exists */}
      {hasStarted && messages.length > 0 && (
        <div className="absolute top-4 right-6 z-20">
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-[10px] text-neutral-500 hover:text-neutral-300 border border-neutral-800 hover:border-neutral-700 rounded-lg px-2.5 py-1.5 transition bg-neutral-950/80 backdrop-blur-sm"
          >
            <X className="h-3 w-3" /> Clear chat
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      {hasStarted ? (
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 flex flex-col relative z-10">
          <div className="max-w-3xl w-full mx-auto space-y-8 pb-32">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                {msg.sender === 'user' ? (
                  <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 text-neutral-100 rounded-2xl px-5 py-2.5 max-w-lg text-sm font-medium leading-relaxed border border-white/5 shadow-md">
                    {msg.text}
                  </div>
                ) : (
                  <div className="w-full max-w-2xl space-y-2">
                    {/* Oni avatar & label */}
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-neutral-800 border border-neutral-750 flex items-center justify-center text-[10px] font-bold text-neutral-350">
                        O
                      </div>
                      <span className="text-[10px] font-extrabold tracking-wider text-neutral-400">ONI</span>
                    </div>

                    {/* Oni Response Text - No container box or badge */}
                    <div className="pl-8 space-y-3">
                      <p className="text-sm text-neutral-300 whitespace-pre-line leading-relaxed">
                        {msg.text}
                      </p>

                      {msg.requiresApproval && (
                        <div className="flex gap-2 pt-2">
                          {msg.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(msg.id, msg.actionId || '', 'approved')}
                                className="rounded bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(msg.id, msg.actionId || '', 'rejected')}
                                className="rounded border border-neutral-800 bg-transparent px-3.5 py-1 text-xs font-medium text-neutral-400 hover:bg-neutral-900 transition"
                              >
                                Reject
                              </button>
                            </>
                          ) : msg.status === 'approved' ? (
                            <span className="text-xs font-semibold text-green-400">✓ Approved</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-400">✗ Rejected</span>
                          )}
                        </div>
                      )}

                      {/* Display matched candidate profiles if agent is hiring, and status is approved */}
                      {msg.agentUsed === 'hiring' && msg.status === 'approved' && (msg.candidatesList || msg.candidatesLoading) && (
                        <div className="mt-4 pt-4 border-t border-neutral-850 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Matched Candidates</span>
                            <span className="flex items-center gap-1 text-[9px] text-neutral-500">
                              <Info className="h-3 w-3" /> Demo data — awaiting LinkedIn API
                            </span>
                          </div>
                          {msg.candidatesLoading ? (
                            <div className="flex items-center gap-2 py-2 text-xs text-neutral-400">
                              <span className="animate-spin h-3 w-3 border-2 border-neutral-500 border-t-transparent rounded-full" />
                              Searching matching candidates...
                            </div>
                          ) : msg.candidatesList ? (
                            <div className="grid gap-2">
                              {msg.candidatesList.filter(c => typeof c?.name === 'string' && c.name.trim().length > 0).map((cand, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedCandidate(cand)}
                                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 p-3 hover:border-neutral-750 transition cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-neutral-850 flex items-center justify-center text-xs font-bold text-neutral-400">
                                      {(cand.name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                      <h4 className="text-xs font-semibold text-neutral-200">{cand.name}</h4>
                                      <p className="text-[10px] text-neutral-500">{cand.role} · {cand.currentCompany}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {/* Tooltip & Mail Button */}
                                    <div className="relative group">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEmailCandidateDirect(cand);
                                        }}
                                        className="rounded-lg p-2 bg-neutral-900 border border-neutral-850 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                                      >
                                        <Mail className="h-3.5 w-3.5" />
                                      </button>
                                      <div className="absolute bottom-full mb-2 hidden group-hover:block left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                                        Opens your email client
                                      </div>
                                    </div>

                                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                                      {cand.matchScore}% Match
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-neutral-800 border border-neutral-750 flex items-center justify-center text-[10px] font-bold text-neutral-350">
                    O
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-neutral-400">ONI</span>
                </div>
                <div className="pl-8 py-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-neutral-400 animate-pulse">Thinking</span>
                  <span className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      ) : (
        // Empty State: Centered Greeting and Input layout
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300 relative z-10">
          <div className="max-w-xl w-full flex flex-col items-center gap-5">
            <h1 className="text-4xl font-semibold tracking-tight text-neutral-50 flex items-center justify-center gap-2">
              <Sun className="h-7 w-7 text-amber-400 shrink-0" />
              <span>{greeting},</span>&nbsp;&nbsp;<span className="font-light text-neutral-400">{founderName || 'Founder'}</span>
            </h1>
            
            {/* Input Row - cap at max-w-xl, rounded-3xl, soft white border, faint shadow */}
            <form onSubmit={handleSubmit} className="flex items-center gap-4 bg-neutral-900 border border-white/10 rounded-3xl py-6 px-6 shadow-lg shadow-black/45 focus-within:border-neutral-700 transition w-full">
              <button type="button" className="text-neutral-500 hover:text-neutral-350 transition shrink-0">
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="How can I help you today?"
                className="flex-1 bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              <div className="flex items-center gap-4 shrink-0">
                <button type="button" className="text-neutral-500 hover:text-neutral-300 transition">
                  <Sparkles className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`${isListening ? 'text-red-500 animate-pulse' : 'text-neutral-500 hover:text-neutral-300'} transition`}
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-neutral-150 hover:bg-neutral-600 transition disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </form>

            {/* Templates Quick pills section - sit directly below with gap-4 */}
            <div className="flex flex-wrap gap-2.5 justify-center mt-1">
              <button
                onClick={() => handleQuery('Check my runway & active snapshots')}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Check my runway
              </button>
              <button
                onClick={() => handleQuery('Draft an NDA for hiring developer')}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition"
              >
                <FileText className="h-3.5 w-3.5" />
                Draft an NDA
              </button>
              <button
                onClick={() => handleQuery('Write a GTM launch post for LinkedIn')}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-neutral-400 hover:border-neutral-750 hover:text-neutral-200 transition"
              >
                <Megaphone className="h-3.5 w-3.5" />
                Write a launch post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom bar input - displayed only once chat has started */}
      {hasStarted && (
        <div className="absolute bottom-6 left-0 right-0 z-20 w-full max-w-4xl mx-auto px-8 transition-all duration-300 ease-out">
          <form onSubmit={handleSubmit} className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
            <button type="button" className="text-neutral-500 hover:text-neutral-305 transition shrink-0">
              <Paperclip className="h-4 w-4" />
            </button>
            <button type="button" className="text-neutral-500 hover:text-neutral-305 transition shrink-0">
              <ImageIcon className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message..."
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-neutral-105 placeholder-neutral-500 focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={toggleListening}
                className={`${isListening ? 'text-red-500 animate-pulse' : 'text-neutral-500 hover:text-neutral-300'} transition`}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button type="button" className="text-neutral-500 hover:text-neutral-305 transition">
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-neutral-150 hover:bg-neutral-600 transition disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

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
                  {selectedCandidate.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
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

              <div className="flex flex-col gap-1.5 border-b border-neutral-800 pb-5">
                <button
                  onClick={() => handleEmailCandidateDirect(selectedCandidate)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-neutral-100 px-4 py-2.5 text-sm font-bold text-neutral-950 hover:bg-neutral-200 transition"
                >
                  <Mail className="h-4 w-4" />
                  Email Candidate
                </button>
                <p className="text-[10px] text-neutral-500 text-center">
                  Opens your email client
                </p>
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex border-b border-neutral-800">
                {[{ id: 'ai', label: 'AI Analysis' }, { id: 'skills', label: 'Skills' }].map((tab) => (
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
              <div className="space-y-4">
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 rounded-xl bg-neutral-900 border border-neutral-700 px-5 py-3 text-sm text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {toast}
        </div>
      )}

      {/* ── Contact Candidate Modal (Custom Contact Page Overlay) ── */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Mail className="h-5 w-5 text-neutral-400" /> Contact Candidate
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">Send the job description and custom message to {emailCandidateName}</p>
              </div>
              <button
                onClick={() => setEmailModalOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Recipient Email</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full rounded-xl border border-neutral-850 bg-neutral-900/50 px-4 py-2.5 text-sm text-neutral-250 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition"
                  placeholder="candidate@example.com"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-neutral-850 bg-neutral-900/50 px-4 py-2.5 text-sm text-neutral-250 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition"
                  placeholder="Subject of the email"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">Message Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-xl border border-neutral-850 bg-neutral-900/50 px-4 py-2.5 text-xs text-neutral-300 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition resize-y font-sans leading-relaxed"
                  placeholder="Write your message here..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-850">
              <span className="text-[10px] text-neutral-500 max-w-[60%] leading-normal">
                Clicking send will launch your configured system mail client with the drafted details.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="rounded-xl border border-neutral-850 bg-transparent px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-900 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    window.location.href = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
                    setEmailModalOpen(false);
                    showToast(`📧 Draft loaded in your mail client for ${emailTo}`);
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                >
                  <Send className="h-3.5 w-3.5" /> Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
