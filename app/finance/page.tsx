'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, Sparkles, RefreshCw, Landmark, AlertTriangle, 
  TrendingDown, TrendingUp, Calendar, ArrowRight, ShieldCheck, Check, X
} from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

// Mock charts & datasets derived from the legacy finance.html structure
const COMPLIANCE_ITEMS = [
  { name: 'GSTR-3B filing', due: 'Due in 4 days · 08 Jul', status: 'yellow' },
  { name: 'TDS deposit (Jun)', due: 'Overdue by 2 days', status: 'red' },
  { name: 'GSTR-2B reconciliation', due: 'Matched · 96% coverage', status: 'green' },
  { name: 'E-invoicing compliance', due: 'All invoices compliant', status: 'green' },
  { name: 'PF / ESI deposit', due: 'Due in 11 days · 15 Jul', status: 'yellow' },
];

const BUDGETS = [
  { cat: 'Engineering', budget: 700000, actual: 610000 },
  { cat: 'Marketing', budget: 300000, actual: 350000 },
  { cat: 'Operations', budget: 180000, actual: 140000 },
  { cat: 'HR & recruiting', budget: 150000, actual: 210000 },
];

const PAYROLL = [
  { name: 'A. Rao', team: 'Engineering', role: 'Eng Lead', cost: 220000 },
  { name: 'S. Mehta', team: 'Engineering', role: 'Sr Backend Eng', cost: 190000 },
  { name: 'K. Iyer', team: 'Engineering', role: 'Frontend Eng', cost: 150000 },
  { name: 'R. Nair', team: 'Engineering', role: 'ML Engineer', cost: 180000 },
  { name: 'P. Sharma', team: 'Marketing', role: 'Marketing Lead', cost: 160000 },
  { name: 'D. Kapoor', team: 'Marketing', role: 'Growth Associate', cost: 90000 },
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

export default function FinancePage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual Snapshot parameters
  const [cashInput, setCashInput] = useState('');
  const [burnInput, setBurnInput] = useState('');
  const [runwayDisplay, setRunwayDisplay] = useState<number | null>(null);
  const [dbSnapshots, setDbSnapshots] = useState<{ id: string; cash_in_bank: number; monthly_burn: number; runway_months: number; created_at: string }[]>([]);

  // Simulation parameters
  const [simHires, setSimHires] = useState(0);
  const [simCost, setSimCost] = useState(120000);
  const [simSalaryIncrease, setSimSalaryIncrease] = useState(0);
  const [simMarketingIncrease, setSimMarketingIncrease] = useState(0);

  const fetchFinanceData = async () => {
    // 1. Fetch finance snapshot rows
    const { data: snapshots, error: snapErr } = await supabase
      .from('finance_snapshots')
      .select('id, cash_in_bank, monthly_burn, runway_months, created_at')
      .eq('founder_id', FOUNDER_ID)
      .order('created_at', { ascending: false });

    if (!snapErr && snapshots) {
      setDbSnapshots(snapshots as any);
      if (snapshots.length > 0) {
        setRunwayDisplay(snapshots[0].runway_months);
      }
    }

    // 2. Fetch agent responses
    const { data: actionsData, error: actErr } = await supabase
      .from('agent_actions')
      .select('id, agent_type, input_message, output_draft, requires_approval, status, created_at')
      .eq('founder_id', FOUNDER_ID)
      .eq('agent_type', 'finance')
      .order('created_at', { ascending: false });

    if (!actErr && actionsData) {
      const mapped: ActionCard[] = actionsData.map((row) => ({
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
    fetchFinanceData();
  }, []);

  // Submit manual snapshot parameters
  const handleSaveSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    const cash = parseFloat(cashInput);
    const burn = parseFloat(burnInput);
    if (isNaN(cash) || isNaN(burn) || burn <= 0) return;

    const runway = cash / burn;

    try {
      const uuid = crypto.randomUUID();
      const { error: insertErr } = await supabase.from('finance_snapshots').insert({
        id: uuid,
        founder_id: FOUNDER_ID,
        cash_in_bank: cash,
        monthly_burn: burn,
        runway_months: runway
      });

      if (insertErr) throw new Error(insertErr.message);

      setCashInput('');
      setBurnInput('');
      await fetchFinanceData();
    } catch (err: any) {
      alert(`Snapshot save failed: ${err.message}`);
    }
  };

  // Submit AI prompt query
  const handleQueryAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setError(null);

    try {
      const { data: profile } = await supabase
        .from('founder_profile')
        .select('*')
        .eq('id', FOUNDER_ID)
        .single();

      const res = await fetch('/api/agent/finance', {
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

      await fetchFinanceData();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Simulation calculations
  const CURRENT_PAYROLL = 1000000; // Mock current baseline parameters
  const CURRENT_MARKETING = 350000;
  const CURRENT_GROSS_BURN = 1840000;
  const CASH_BALANCE = dbSnapshots[0]?.cash_in_bank ?? 14800000;

  const simNewPayroll = CURRENT_PAYROLL * (1 + simSalaryIncrease / 100) + simHires * simCost;
  const simPayrollDelta = simNewPayroll - CURRENT_PAYROLL;
  const simMarketingDelta = CURRENT_MARKETING * (simMarketingIncrease / 100);
  const simBaselineOther = 490000;

  const simFinalBurn = simNewPayroll + (CURRENT_MARKETING + simMarketingDelta) + simBaselineOther;
  const simFinalRunway = CASH_BALANCE / simFinalBurn;
  const simCurrentRunway = CASH_BALANCE / CURRENT_GROSS_BURN;
  const simRunwayDelta = simFinalRunway - simCurrentRunway;

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${(val / 1000).toFixed(0)}k`;
  };

  // Derived stats
  const cashBalance = dbSnapshots[0]?.cash_in_bank ?? 0;
  const monthlyBurn = dbSnapshots[0]?.monthly_burn ?? 0;
  const computedRunway = (cashBalance > 0 && monthlyBurn > 0) ? (cashBalance / monthlyBurn) : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
          <Landmark className="h-5 w-5 text-green-500" /> Finance Command
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">Live runway calculation, scenario simulator, and budget targets</p>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        
        {/* Real Ticker Ledger Strip */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Cash Balance</p>
            <p className="text-2xl font-bold font-mono text-neutral-100 mt-2">
              {cashBalance > 0 ? formatCurrency(cashBalance) : 'No data yet'}
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Computed Runway</p>
            {computedRunway !== null ? (
              <p className="text-2xl font-bold font-mono text-neutral-100 mt-2">
                {computedRunway.toFixed(1)} mo
              </p>
            ) : (
              <div className="mt-2 space-y-1">
                <p className="text-xs font-semibold text-amber-400">No data yet</p>
                <p className="text-[9px] text-neutral-500">Log a snapshot to compute</p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Monthly Burn</p>
            <p className="text-2xl font-bold font-mono text-neutral-100 mt-2">
              {monthlyBurn > 0 ? formatCurrency(monthlyBurn) : 'No data yet'}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">ARR</p>
            <p className="text-2xl font-bold font-mono text-neutral-100 mt-2">₹1.02Cr</p>
          </div>
        </div>

        {/* Input Forms Splits */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Form 1: Save Real Snapshot */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 md:col-span-1 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Log Snapshot</h3>
              <p className="text-[11px] text-neutral-500">Record cash-in-bank & burn rates</p>
            </div>
            <form onSubmit={handleSaveSnapshot} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-medium text-neutral-500 uppercase block mb-1">Cash in Bank (₹)</label>
                <input 
                  type="number" 
                  value={cashInput} 
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="e.g. 15000000"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-150 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-neutral-500 uppercase block mb-1">Monthly Burn (₹)</label>
                <input 
                  type="number" 
                  value={burnInput} 
                  onChange={(e) => setBurnInput(e.target.value)}
                  placeholder="e.g. 2000000"
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-150 focus:outline-none"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full rounded-lg bg-green-500/10 border border-green-500/20 py-2 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition"
              >
                Log Metrics
              </button>
            </form>
          </div>

          {/* Form 2: AI Query Prompt */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6 md:col-span-2 space-y-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">Query Finance Agent</h3>
              <p className="text-[11px] text-neutral-500">Evaluate financial targets or draft scenarios</p>
            </div>
            <form onSubmit={handleQueryAgent} className="space-y-4">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask agent to draft financial forecasts, calculate burn estimations..."
                disabled={loading}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="rounded-xl bg-neutral-100 px-5 py-2 text-xs font-semibold text-neutral-950 hover:bg-neutral-200 transition disabled:opacity-50"
              >
                Query Agent
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic Interactive Scenario Simulator */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 mb-1">Scenario Simulator</h2>
          <p className="text-xs text-neutral-500 mb-6">Drag metrics sliders below to project changes on your runway runway</p>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>New Hires</span>
                  <span className="font-bold text-neutral-200 font-mono">{simHires}</span>
                </div>
                <input 
                  type="range" min="0" max="10" step="1" 
                  value={simHires} onChange={(e) => setSimHires(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Salary Cost Per Hire (₹)</span>
                  <span className="font-bold text-neutral-200 font-mono">{formatCurrency(simCost)}</span>
                </div>
                <input 
                  type="range" min="50000" max="300000" step="10000" 
                  value={simCost} onChange={(e) => setSimCost(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>General Salary Raise</span>
                  <span className="font-bold text-neutral-200 font-mono">{simSalaryIncrease}%</span>
                </div>
                <input 
                  type="range" min="-20" max="50" step="5" 
                  value={simSalaryIncrease} onChange={(e) => setSimSalaryIncrease(parseInt(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>Marketing Spend Raise</span>
                  <span className="font-bold text-neutral-200 font-mono">{simMarketingIncrease}%</span>
                </div>
                <input 
                  type="range" min="-50" max="200" step="10" 
                  value={simMarketingIncrease} onChange={(e) => setSimMarketingIncrease(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Simulated Output Panels */}
            <div className="grid grid-cols-3 gap-0.5 bg-neutral-800 rounded-xl overflow-hidden self-start">
              <div className="bg-neutral-950 p-4">
                <div className="text-[9px] uppercase tracking-wider text-neutral-500">New Payroll</div>
                <div className="text-sm font-semibold font-mono text-neutral-200 mt-2">{formatCurrency(simNewPayroll)}</div>
                <div className="text-[10px] text-neutral-500">+{formatCurrency(simPayrollDelta)}</div>
              </div>
              <div className="bg-neutral-950 p-4">
                <div className="text-[9px] uppercase tracking-wider text-neutral-500">Final Burn</div>
                <div className="text-sm font-semibold font-mono text-neutral-200 mt-2">{formatCurrency(simFinalBurn)}</div>
                <div className="text-[10px] text-neutral-500">+{formatCurrency(simFinalBurn - CURRENT_GROSS_BURN)}</div>
              </div>
              <div className="bg-neutral-950 p-4">
                <div className="text-[9px] uppercase tracking-wider text-neutral-500">Sim Runway</div>
                <div className="text-sm font-semibold font-mono mt-2 text-amber-400">{simFinalRunway.toFixed(1)} mo</div>
                <div className="text-[10px] text-neutral-500">{simRunwayDelta >= 0 ? '+' : ''}{simRunwayDelta.toFixed(1)} mo</div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic lists matching legacy tables */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Table 1: Compliance tracker */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Compliance & Filings</h3>
            <div className="divide-y divide-neutral-850">
              {COMPLIANCE_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${
                      item.status === 'red' ? 'bg-red-500' : item.status === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                    }`} />
                    <span className="text-xs font-medium text-neutral-300">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">{item.due}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Table 2: Budget Vs Actuals */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Budget vs Actuals</h3>
            <div className="divide-y divide-neutral-850">
              {BUDGETS.map((item, i) => {
                const over = item.actual > item.budget;
                return (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-xs font-medium text-neutral-300">{item.cat}</div>
                      <div className="text-[9px] text-neutral-500">Budget: {formatCurrency(item.budget)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-neutral-300">{formatCurrency(item.actual)}</div>
                      <span className={`text-[10px] font-mono ${over ? 'text-red-400' : 'text-green-400'}`}>
                        {over ? '+' : ''}{formatCurrency(item.actual - item.budget)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
