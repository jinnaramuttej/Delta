'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Scale, FileText, Check, X, ShieldAlert, Award, 
  Download, Sparkles, RefreshCw, UploadCloud, FileCheck, Send,
  ChevronDown, ChevronUp
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

// Predefined list of document templates from original index.html
const DOC_TEMPLATES = [
  { id: 'nda', name: 'NDA', desc: 'Non-Disclosure Agreement to protect confidential business information shared between parties.' },
  { id: 'employment', name: 'Employment Contract', desc: 'Comprehensive employment agreement covering roles, compensation, benefits, and termination terms.' },
  { id: 'offer', name: 'Offer Letter', desc: 'Formal job offer detailing position, salary, start date, and conditions.' },
  { id: 'privacy', name: 'Privacy Policy', desc: 'GDPR and CCPA compliant privacy policy for collecting and handling user personal data.' },
  { id: 'terms', name: 'Terms & Conditions', desc: 'Website or app terms of service covering user obligations and dispute resolution.' }
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

export default function LegalPage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const statusColors: Record<string, string> = {
    pending:  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    sent:     'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    posted:   'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  const fetchLegalActions = async () => {
    const { data, error } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'legal')
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
    fetchLegalActions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedTemplate) return;

    const documentTypePrompt = selectedTemplate ? `Create a ${selectedTemplate} document. ` : '';
    const finalMessage = `${documentTypePrompt}${message}`.trim();

    setMessage('');
    setSelectedTemplate('');
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await supabase
        .from('founder_profile')
        .select('*')
        .eq('id', FOUNDER_ID)
        .single();

      const res = await fetch('/api/agent/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          founderId: FOUNDER_ID,
          message: finalMessage,
          extractedContext: selectedTemplate || 'legal document',
          founderProfile: profile || {},
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed: ${res.status}`);
      }

      await fetchLegalActions();
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

  const handleSendForSignature = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agent_actions')
        .update({ status: 'sent' })
        .eq('id', id);
      if (!error) {
        setActions((prev) => prev.map((c) => c.id === id ? { ...c, status: 'sent' } : c));
        showToast('✅ Sent for e-signature (simulated)');
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl bg-neutral-900 border border-neutral-700 px-5 py-3 text-sm text-neutral-100 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
            <Scale className="h-5 w-5 text-amber-500" /> Legal Command
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">Automated agreement generator, compliance templates, and disclaimer suffix reviews</p>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-10">
        
        {/* Document Template Selection Cards Grid */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-4">
            📜 Choose Document Template to Generate
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {DOC_TEMPLATES.map((tmpl) => (
              <div 
                key={tmpl.id} 
                className={`rounded-xl border p-5 flex flex-col justify-between transition cursor-pointer hover:border-neutral-700 ${
                  selectedTemplate === tmpl.name 
                    ? 'border-amber-500 bg-amber-500/5' 
                    : 'border-neutral-800 bg-neutral-900/10'
                }`}
                onClick={() => setSelectedTemplate(tmpl.name)}
              >
                <div>
                  <h3 className="text-xs font-bold text-neutral-250 mb-1.5 leading-snug">{tmpl.name}</h3>
                  <p className="text-[10px] text-neutral-500 leading-relaxed mb-4">{tmpl.desc}</p>
                </div>
                <button 
                  className={`w-full py-1 text-[10px] font-bold rounded-lg transition ${
                    selectedTemplate === tmpl.name
                      ? 'bg-amber-500 text-neutral-950 hover:bg-amber-600'
                      : 'bg-neutral-850 text-neutral-300 hover:bg-neutral-800'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTemplate(tmpl.name);
                  }}
                >
                  Select
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Input prompt query section */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              {selectedTemplate ? `Generating: ${selectedTemplate}` : 'Custom Instruction'}
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">Specify extra clauses, parties name, and custom parameters below</p>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask legal agent to draft custom clauses or supply extra details..."
              disabled={loading}
              className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={(!message.trim() && !selectedTemplate) || loading}
              className="rounded-xl bg-neutral-100 px-6 py-3 text-sm font-semibold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-50"
            >
              Ask AI
            </button>
          </form>
        </section>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/40 p-6 flex items-center justify-center py-10">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-neutral-300">Drafting compliance template...</p>
              <p className="text-xs text-neutral-500">Requires lawyer validation suffix</p>
            </div>
          </div>
        )}

        {/* ── Document History Section ── */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            📋 Document History
          </h2>
          {actions.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 text-center text-sm text-neutral-500">
              No legal documents drafted yet. Choose a template or custom prompt above to start.
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((asset) => {
                const isExpanded = expandedId === asset.id;
                const parsedTitle = asset.draft.split('\n')[0].replace(/^#+\s*/, '') || 'Legal Document';

                return (
                  <div key={asset.id} className="rounded-xl border border-neutral-800 bg-neutral-900/10 hover:border-neutral-750 transition overflow-hidden">
                    <div 
                      onClick={() => setExpandedId(isExpanded ? null : asset.id)}
                      className="p-5 flex items-center justify-between cursor-pointer"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-neutral-250 truncate">{parsedTitle}</h4>
                        <p className="text-xs text-neutral-500 mt-1">Prompt: "{asset.inputMessage}"</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${statusColors[asset.status] || 'bg-neutral-800 text-neutral-400'}`}>
                          {asset.status}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'}
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-neutral-500" /> : <ChevronDown className="h-4 w-4 text-neutral-500" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-2 border-t border-neutral-850 space-y-4 animate-in fade-in duration-200">
                        {/* Legal Review Disclaimer Badge */}
                        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-400 w-fit">
                          <ShieldAlert className="h-4 w-4 shrink-0" />
                          Draft — requires lawyer review
                        </div>

                        <div className="whitespace-pre-line text-sm leading-relaxed text-neutral-350 bg-neutral-950/45 p-4 rounded-xl border border-neutral-900 font-mono">
                          {asset.draft}
                        </div>

                        {asset.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t border-neutral-850">
                            <button
                              onClick={() => handleUpdateStatus(asset.id, 'approved')}
                              className="rounded bg-neutral-100 px-3.5 py-1.5 text-xs font-bold text-neutral-950 hover:bg-neutral-200 transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(asset.id, 'rejected')}
                              className="rounded border border-neutral-800 bg-transparent px-3.5 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-900 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {asset.status === 'approved' && (
                          <div className="flex gap-2 pt-2 border-t border-neutral-850">
                            <button
                              onClick={() => handleSendForSignature(asset.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3.5 py-1.5 text-xs font-semibold text-violet-400 hover:bg-violet-500/20 transition"
                            >
                              <Send className="h-3.5 w-3.5" /> Send for Signature
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
