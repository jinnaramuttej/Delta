'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Megaphone, FileText, Check, X, ChevronDown, ChevronUp,
  Sparkles, RefreshCw, Camera, Bird, Link2,
  MessageSquare, Globe, Target, Zap, BarChart2, Share2,
  Eye, Heart, MessageCircle, Send as SendIcon, Bookmark,
  Repeat, ExternalLink, Award
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

const CONTENT_TYPES = [
  {
    id: 'Social Caption',
    name: 'Social Caption',
    icon: MessageSquare,
    desc: 'Short punchy caption for Instagram, Twitter, or LinkedIn with a CTA.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-400/40',
    activeBg: 'bg-purple-500/20 border-purple-400/50',
  },
  {
    id: 'Launch Post',
    name: 'Launch Post',
    icon: Zap,
    desc: 'Full product launch announcement post with storytelling and momentum.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-400/40',
    activeBg: 'bg-blue-500/20 border-blue-400/50',
  },
  {
    id: 'Landing Page Copy',
    name: 'Landing Page Copy',
    icon: Globe,
    desc: 'Headline, subheadline, 3 benefit bullets, and a conversion-focused CTA.',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20 hover:border-green-400/40',
    activeBg: 'bg-green-500/20 border-green-400/50',
  },
  {
    id: 'Positioning Statement',
    name: 'Positioning Statement',
    icon: Target,
    desc: 'Strategic positioning in "For [target], [product] is the [category] that..." format.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-400/40',
    activeBg: 'bg-amber-500/20 border-amber-400/50',
  },
];

type ActionCard = {
  id: string;
  inputMessage: string;
  draft: string;
  requiresApproval: boolean;
  status: string;
  createdAt: string;
};

export default function GTMPage() {
  const [actions, setActions]               = useState<ActionCard[]>([]);
  const [message, setMessage]               = useState('');
  const [selectedType, setSelectedType]     = useState('');
  const [expandedId, setExpandedId]         = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [fetchLoading, setFetchLoading]     = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const [founderProfile, setFounderProfile] = useState<any>(null);
  const [toast, setToast]                   = useState<string | null>(null);

  // Social Preview modal states
  const [previewCard, setPreviewCard]       = useState<ActionCard | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<'Instagram' | 'Twitter/X' | 'LinkedIn'>('Instagram');
  const [publishingState, setPublishingState] = useState<'idle' | 'posting' | 'success'>('idle');
  const [likesCount, setLikesCount]         = useState(0);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const statusColors: Record<string, string> = {
    pending:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    posted:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'gtm')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setActions(data.map((row) => ({
        id: row.id,
        inputMessage: row.input_message,
        draft: (row.output_draft as { text?: string })?.text ?? '',
        requiresApproval: row.requires_approval,
        status: row.status,
        createdAt: row.created_at,
      })));
    }
    setFetchLoading(false);
  };

  useEffect(() => {
    fetchActions();
    supabase
      .from('founder_profile')
      .select('*')
      .eq('id', FOUNDER_ID)
      .single()
      .then(({ data }) => { if (data) setFounderProfile(data); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedType) return;

    const finalMessage = selectedType
      ? `Write a ${selectedType}. ${message}`.trim()
      : message;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agent/gtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: finalMessage,
          extractedContext: selectedType || finalMessage,
          founderProfile,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'GTM agent request failed');
      }

      setMessage('');
      setSelectedType('');
      showToast('✅ Marketing copy drafted!');
      await fetchActions();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, nextStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('agent_actions')
      .update({ status: nextStatus, approved: nextStatus === 'approved' })
      .eq('id', id);

    if (!error) {
      await fetchActions();
      showToast(nextStatus === 'approved' ? '✅ Draft approved!' : '❌ Draft rejected.');
    }
  };

  const handleSimulatedPublish = async () => {
    if (!previewCard) return;
    setPublishingState('posting');

    // Simulate 1.5s delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update status to 'posted' in Supabase
    const { error } = await supabase
      .from('agent_actions')
      .update({ status: 'posted' })
      .eq('id', previewCard.id);

    if (!error) {
      setPublishingState('success');
      // Count-up animation simulation: start at 0, tick up to random 12-25
      const targetLikes = Math.floor(Math.random() * 14) + 12;
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= targetLikes) {
          current = targetLikes;
          clearInterval(interval);
        }
        setLikesCount(current);
      }, 80);

      // Refresh list, wait a moment, then close modal
      await fetchActions();
      setTimeout(() => {
        setPreviewCard(null);
        setPublishingState('idle');
        setLikesCount(0);
        showToast(`🚀 Published to ${previewPlatform} (simulated)!`);
      }, 2000);
    } else {
      setPublishingState('idle');
      showToast('❌ DB update failed');
    }
  };

  // Utility helpers
  const getStartupInitials = () => {
    if (!founderProfile?.startup_name) return 'FS';
    return founderProfile.startup_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getHandle = () => {
    if (!founderProfile?.startup_name) return 'startup';
    return founderProfile.startup_name.toLowerCase().replace(/\s+/g, '');
  };

  const extractHashtags = (text: string) => {
    const tags = text.match(/#[a-zA-Z0-9_]+/g);
    return tags ? tags.join(' ') : '#startup #founder #growth';
  };

  // ─── Derived stats ─────────────────────────────────────────────
  const total    = actions.length;
  const pending  = actions.filter(a => a.status === 'pending').length;
  const approved = actions.filter(a => a.status === 'approved').length;
  const rejected = actions.filter(a => a.status === 'rejected').length;
  const posted   = actions.filter(a => a.status === 'posted').length;

  const pendingApproval = actions.filter(a => a.status === 'pending' && a.requiresApproval);
  const postedFeeds     = actions.filter(a => a.status === 'posted');
  const history         = actions;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 rounded-xl bg-neutral-900 border border-neutral-700 px-5 py-3 text-sm text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-neutral-400" /> GTM & Marketing
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5 font-medium">AI-drafted marketing copy, launch posts, and growth content.</p>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-8">

        {/* ─── Stats Strip ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total Drafts', value: total,    color: 'text-neutral-200' },
            { label: 'Pending',      value: pending,  color: 'text-amber-400' },
            { label: 'Approved',     value: approved, color: 'text-green-400' },
            { label: 'Rejected',     value: rejected, color: 'text-red-400' },
            { label: 'Posted Feed',  value: posted,   color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-4 space-y-1">
              <p className={`text-2xl font-bold ${color}`}>{fetchLoading ? '–' : value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
            </div>
          ))}
        </div>

        {/* ─── Content Type Selector ─────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Content Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CONTENT_TYPES.map((ct) => {
              const Icon     = ct.icon;
              const isActive = selectedType === ct.id;
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setSelectedType(isActive ? '' : ct.id)}
                  className={`rounded-xl border p-4 text-left transition-all duration-150 space-y-2 ${isActive ? ct.activeBg : ct.bg}`}
                >
                  <Icon className={`h-5 w-5 ${ct.color}`} />
                  <p className={`text-xs font-bold ${ct.color}`}>{ct.name}</p>
                  <p className="text-[10px] text-neutral-500 leading-relaxed">{ct.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── Query Input ───────────────────────────────────────── */}
        <section className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 space-y-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Ask AI</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {selectedType
                ? `Generating: ${selectedType}. Add extra context below, or just hit Ask AI.`
                : 'Describe what marketing copy you need, or select a type above.'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={
                selectedType === 'Social Caption'        ? 'e.g. announcing our beta launch on Product Hunt…' :
                selectedType === 'Launch Post'           ? 'e.g. we just crossed 100 users and launched our free tier…' :
                selectedType === 'Landing Page Copy'     ? 'e.g. our product helps solo founders automate their legal work…' :
                selectedType === 'Positioning Statement' ? 'e.g. targeting early-stage SaaS founders who hate legal paperwork…' :
                'e.g. write a LinkedIn post about our Series A announcement…'
              }
              rows={3}
              className="w-full rounded-xl border border-neutral-850 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition resize-none"
            />
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <X className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || (!message.trim() && !selectedType)}
                className="flex items-center gap-2 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Drafting marketing copy with AI…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Ask AI
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* ─── Approval Queue ────────────────────────────────────── */}
        {pendingApproval.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              Approval Queue
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/20">
                {pendingApproval.length}
              </span>
            </h2>
            <div className="space-y-3">
              {pendingApproval.map(card => (
                <div key={card.id} className="rounded-xl border border-amber-500/20 bg-neutral-900/10 p-4 space-y-3 hover:border-amber-500/30 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-200 truncate">
                        {card.draft.split('\n')[0].replace(/^#+\s*/, '') || 'GTM Draft'}
                      </p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 truncate">Prompt: "{card.inputMessage}"</p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold capitalize border shrink-0 ${statusColors[card.status] ?? 'bg-neutral-800 text-neutral-400'}`}>
                      {card.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-3 leading-relaxed whitespace-pre-line">{card.draft}</p>
                  <div className="flex gap-2 pt-2 border-t border-neutral-800/80">
                    <button onClick={() => handleUpdateStatus(card.id, 'approved')} className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition">
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button onClick={() => handleUpdateStatus(card.id, 'rejected')} className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-900/40 transition">
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => setPreviewCard(card)}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition"
                    >
                      <Eye className="h-3.5 w-3.5" /> Preview Post
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── All Drafts History ────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-200">All Drafts</h2>
          {fetchLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-neutral-900" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-8 text-center space-y-2">
              <Megaphone className="h-8 w-8 text-neutral-700 mx-auto" />
              <p className="text-sm text-neutral-500">No GTM drafts yet.</p>
              <p className="text-xs text-neutral-600">Select a content type above and ask the AI to generate your first piece.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 divide-y divide-neutral-800 overflow-hidden">
              {history.map(card => {
                const isExpanded = expandedId === card.id;
                const title      = card.draft.split('\n')[0].replace(/^#+\s*/, '').slice(0, 90) || 'Marketing Draft';
                return (
                  <div key={card.id} className="transition duration-150 hover:bg-neutral-900/20">
                    {/* Row header */}
                    <div
                      className="flex items-center gap-3 px-5 py-3.5 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : card.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-neutral-200 truncate">{title}</p>
                          <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border shrink-0 ${statusColors[card.status] ?? 'bg-neutral-800 text-neutral-400'}`}>
                            {card.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5 truncate">
                          Prompt: "{card.inputMessage}"
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-neutral-600">
                          {new Date(card.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 animate-in fade-in duration-150">
                        {/* Full draft */}
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                            <FileText className="h-3 w-3" /> Draft Content
                          </p>
                          <p className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap">{card.draft}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setPreviewCard(card)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview & Post
                          </button>

                          {card.requiresApproval && card.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(card.id, 'approved')}
                                className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(card.id, 'rejected')}
                                className="flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-900/40 transition"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Simulated Social Feed ────────────────────────────── */}
        <section className="space-y-4 pt-4 border-t border-neutral-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                Simulated Social Feed
                {postedFeeds.length > 0 && (
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400 border border-blue-500/20">
                    {postedFeeds.length}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-neutral-500 mt-0.5">Mock feed of published Go-To-Market updates</p>
            </div>
            <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
              Simulated — No accounts connected
            </span>
          </div>

          {postedFeeds.length === 0 ? (
            <div className="rounded-xl border border-neutral-850 bg-neutral-900/5 p-6 text-center text-xs text-neutral-500 leading-normal">
              No updates published to simulated feeds yet. Click "Preview & Post" on any draft above to post it.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {postedFeeds.map(post => {
                // Determine a simulated type or fall back to Instagram format for rendering in feed
                return (
                  <div key={post.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {getStartupInitials()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-neutral-250 truncate">@{getHandle()}</p>
                        <p className="text-[9px] text-neutral-500">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-1.5 py-0.5">
                        Published
                      </span>
                    </div>

                    {/* Image Mockup (simple gradient box) */}
                    <div className="aspect-video w-full rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center border border-neutral-850">
                      <span className="text-xl font-black text-neutral-700 tracking-wider opacity-60">{founderProfile?.startup_name || 'FOUNDER OS'}</span>
                    </div>

                    {/* Text */}
                    <div className="space-y-1">
                      <p className="text-xs text-neutral-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">{post.draft}</p>
                      <p className="text-[10px] text-blue-450 font-semibold">{extractHashtags(post.draft)}</p>
                    </div>

                    {/* Social Mock Stats */}
                    <div className="flex items-center justify-between text-neutral-500 text-[10px] pt-3 border-t border-neutral-900">
                      <span className="flex items-center gap-1 font-semibold text-neutral-400">
                        <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
                        {Math.floor((post.id.charCodeAt(0) % 20) + 18)} Likes
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.id.charCodeAt(1) % 4} comments
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ─── Social Preview Modal ─────────────────────────────── */}
      {previewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative flex w-full max-w-lg flex-col rounded-2xl border border-neutral-850 bg-neutral-950 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-850 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-200 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-purple-400" /> GTM Social Preview
                </h3>
                <p className="text-[10px] text-neutral-500">Visualize and publish your draft to simulated channels</p>
              </div>
              <button
                onClick={() => { setPreviewCard(null); setPublishingState('idle'); }}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-neutral-200 transition"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Platform tab switcher */}
            <div className="flex bg-neutral-900/80 p-0.5 rounded-lg border border-neutral-850 mb-4">
              {(['Instagram', 'Twitter/X', 'LinkedIn'] as const).map(plat => (
                <button
                  key={plat}
                  onClick={() => setPreviewPlatform(plat)}
                  className={`flex-1 py-1.5 text-center text-xs font-semibold rounded transition ${previewPlatform === plat ? 'bg-neutral-850 text-neutral-100 shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {plat}
                </button>
              ))}
            </div>

            {/* Mockup Card Render Container */}
            <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-900 flex-1 max-h-[350px] overflow-y-auto mb-5">
              {/* Instagram Render */}
              {previewPlatform === 'Instagram' && (
                <div className="bg-neutral-950 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white">
                      {getStartupInitials()}
                    </div>
                    <span className="text-xs font-bold text-neutral-250">@{getHandle()}</span>
                  </div>
                  {/* Square Image placeholder */}
                  <div className="aspect-square w-full rounded bg-gradient-to-br from-indigo-950 via-purple-950 to-neutral-900 flex items-center justify-center border border-neutral-900">
                    <span className="text-xl font-black text-neutral-700 tracking-wider">{founderProfile?.startup_name || 'STARTUP'}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-between items-center text-neutral-400 py-1">
                    <div className="flex gap-3">
                      <Heart className="h-4 w-4 hover:text-red-500 cursor-pointer" />
                      <MessageCircle className="h-4 w-4" />
                      <SendIcon className="h-4 w-4" />
                    </div>
                    <Bookmark className="h-4 w-4" />
                  </div>
                  {/* Text */}
                  <div className="text-xs space-y-1">
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{previewCard.draft}</p>
                    <p className="text-blue-450 font-semibold">{extractHashtags(previewCard.draft)}</p>
                  </div>
                </div>
              )}

              {/* Twitter/X Render */}
              {previewPlatform === 'Twitter/X' && (
                <div className="bg-neutral-950 rounded-lg p-4 space-y-3 border border-neutral-900/60">
                  <div className="flex gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-300">
                      {getStartupInitials()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-neutral-200">{founderProfile?.startup_name || 'Startup'}</span>
                        <span className="text-[10px] text-neutral-500">@{getHandle()}</span>
                      </div>
                      <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{previewCard.draft}</p>
                      <p className="text-[10px] text-blue-400 mt-1">{extractHashtags(previewCard.draft)}</p>
                    </div>
                  </div>
                  {/* Info stats */}
                  <div className="flex justify-between text-neutral-500 text-[10px] pt-2 border-t border-neutral-900 max-w-[85%] mx-auto">
                    <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> 0</span>
                    <span className="flex items-center gap-1"><Repeat className="h-3 w-3" /> 0</span>
                    <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> 0</span>
                  </div>
                  {/* Character count checker */}
                  <div className="flex justify-end pt-2">
                    <span className={`text-[9px] font-bold ${previewCard.draft.length > 280 ? 'text-red-400' : 'text-neutral-500'}`}>
                      {previewCard.draft.length} / 280 chars
                    </span>
                  </div>
                </div>
              )}

              {/* LinkedIn Render */}
              {previewPlatform === 'LinkedIn' && (
                <div className="bg-neutral-950 rounded-lg p-4 space-y-3.5 border border-neutral-900/60">
                  <div className="flex gap-2">
                    <div className="h-9 w-9 rounded-lg bg-neutral-900 flex items-center justify-center text-xs font-bold text-neutral-400 border border-neutral-800">
                      {getStartupInitials()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-200">{founderProfile?.startup_name || 'Startup'}</p>
                      <p className="text-[9px] text-neutral-500">{founderProfile?.industry || 'Startup'} · Early Stage</p>
                    </div>
                  </div>
                  <div className="text-xs space-y-2">
                    {/* Truncated style preview */}
                    <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{previewCard.draft}</p>
                    <p className="text-blue-450 font-semibold">{extractHashtags(previewCard.draft)}</p>
                  </div>
                  {/* Actions */}
                  <div className="flex justify-around text-neutral-500 text-[10px] pt-3 border-t border-neutral-900">
                    <span className="flex items-center gap-1 hover:text-neutral-300 cursor-pointer"><Heart className="h-3 w-3" /> Like</span>
                    <span className="flex items-center gap-1 hover:text-neutral-300 cursor-pointer"><MessageCircle className="h-3 w-3" /> Comment</span>
                    <span className="flex items-center gap-1 hover:text-neutral-300 cursor-pointer"><Share2 className="h-3 w-3" /> Share</span>
                    <span className="flex items-center gap-1 hover:text-neutral-300 cursor-pointer"><SendIcon className="h-3 w-3" /> Send</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions and Status info */}
            <div className="flex flex-col gap-3 pt-3 border-t border-neutral-850">
              <div className="flex justify-between items-center">
                <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                  Simulated — No accounts connected
                </span>
                {publishingState === 'success' && (
                  <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                    <Heart className="h-3 w-3 fill-red-500 text-red-500 animate-bounce" />
                    {likesCount} Likes received!
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setPreviewCard(null); setPublishingState('idle'); }}
                  className="flex-1 rounded-xl border border-neutral-800 bg-transparent px-4 py-2.5 text-xs font-bold text-neutral-400 hover:bg-neutral-900 transition"
                  disabled={publishingState === 'posting'}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSimulatedPublish}
                  disabled={publishingState !== 'idle'}
                  className="flex-2 flex items-center justify-center gap-1.5 rounded-xl bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-40"
                >
                  {publishingState === 'posting' && (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Posting...
                    </>
                  )}
                  {publishingState === 'success' && '✅ Posted Successfully!'}
                  {publishingState === 'idle' && (
                    <>
                      <SendIcon className="h-3.5 w-3.5" />
                      Publish (Simulated)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
