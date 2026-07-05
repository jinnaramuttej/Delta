'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { BarChart3, TrendingUp, CheckCircle, Clock, Percent, Activity, Award } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type ActionCard = {
  id: string;
  agent_type: 'finance' | 'hiring' | 'legal' | 'gtm';
  status: string;
  created_at: string;
};

type Snapshot = {
  runway_months: number;
  created_at: string;
};

export default function AnalyticsPage() {
  const [actions, setActions] = useState<ActionCard[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch agent actions
        const { data: actionsData } = await supabase
          .from('agent_actions')
          .select('id, agent_type, status, created_at')
          .eq('founder_id', FOUNDER_ID);

        if (actionsData) {
          setActions(actionsData as any);
        }

        // 2. Fetch finance snapshots (chronological order)
        const { data: snapshotsData } = await supabase
          .from('finance_snapshots')
          .select('runway_months, created_at')
          .eq('founder_id', FOUNDER_ID)
          .order('created_at', { ascending: true });

        if (snapshotsData) {
          setSnapshots(snapshotsData as any);
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 1. Activity stats
  const totalActions = actions.length;
  const approvedCount = actions.filter(a => a.status === 'approved').length;
  const pendingCount = actions.filter(a => a.status === 'pending').length;
  const rejectedCount = actions.filter(a => a.status === 'rejected').length;

  // 2. Activity Over Time (last 7 days)
  const uniqueDates = actions
    ? Array.from(new Set(actions.map(a => a.created_at?.split('T')[0]).filter(Boolean)))
    : [];
  const hasEnoughActivityData = uniqueDates.length >= 2;

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const activityData = dates.map(date => {
    const count = actions ? actions.filter(a => a.created_at && a.created_at.startsWith(date)).length : 0;
    const dObj = new Date(date);
    const formattedDate = dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { date: formattedDate, count };
  });

  // 3. Agent Distribution (Donut Chart)
  const agentCounts: Record<string, number> = {
    hiring: 0,
    finance: 0,
    legal: 0,
    gtm: 0
  };
  actions.forEach(a => {
    if (a.agent_type && a.agent_type in agentCounts) {
      agentCounts[a.agent_type]++;
    }
  });

  const donutData = Object.entries(agentCounts)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }))
    .filter(d => d.value > 0);

  const COLORS: Record<string, string> = {
    Hiring: '#3b82f6',   // blue-500
    Finance: '#22c55e',  // green-500
    Legal: '#f59e0b',    // amber-500
    Gtm: '#a855f7'       // purple-500
  };

  // 4. Approval Rate calculation
  const totalReviewed = approvedCount + rejectedCount;
  const approvalRate = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;

  // 5. Runway Trend data
  const hasEnoughRunwayData = snapshots.length >= 2;
  const runwayData = snapshots.map(s => {
    const dObj = new Date(s.created_at);
    return {
      date: dObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      runway: parseFloat(Number(s.runway_months).toFixed(1))
    };
  });

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-950 text-neutral-100 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-500 border-t-transparent" />
        <p className="text-xs text-neutral-500 mt-3">Loading analytics metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-950 text-neutral-100 overflow-y-auto pb-24">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 px-8 py-5 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-50 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-neutral-450" /> Analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">Company health, agent activity, and trends over time.</p>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Summary Stats Row */}
        <section className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Actions', value: totalActions, icon: Activity, color: 'text-neutral-400' },
            { label: 'Approved JDs/Docs', value: approvedCount, icon: CheckCircle, color: 'text-green-400' },
            { label: 'Pending Queue', value: pendingCount, icon: Clock, color: 'text-amber-400' },
            { label: 'Avg. Response Time', value: '1.4s', icon: Award, color: 'text-blue-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/10 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-neutral-50">{value}</p>
            </div>
          ))}
        </section>

        {/* 2x2 Grid of Chart Cards */}
        <section className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Card 1: Activity Over Time */}
          <div className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 flex flex-col justify-between h-[280px]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Activity Over Time</h3>
              <p className="text-[10px] text-neutral-550 mt-0.5">Agent request count for the past 7 days</p>
            </div>
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              {hasEnoughActivityData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={10} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }}
                      labelStyle={{ color: '#d4d4d4', fontSize: 10 }}
                      itemStyle={{ color: '#818cf8', fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-neutral-500 text-center">
                  Activity trends will appear here as you use Founder OS
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Agent Distribution */}
          <div className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 flex flex-col justify-between h-[280px]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Agent Distribution</h3>
              <p className="text-[10px] text-neutral-550 mt-0.5">Breakdown of actions executed by each agent</p>
            </div>
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={55}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#737373'} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }}
                      itemStyle={{ fontSize: 10 }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      iconSize={6}
                      formatter={(value, entry: any) => (
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-neutral-500 text-center">
                  No agent activity logged yet.
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Approval Rate */}
          <div className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 flex flex-col justify-between h-[280px]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Approval Rate</h3>
              <p className="text-[10px] text-neutral-550 mt-0.5">Ratio of approved vs rejected drafts</p>
            </div>
            <div className="flex-1 flex flex-col justify-center space-y-4 px-2">
              {totalReviewed > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-4xl font-extrabold text-neutral-50 tracking-tight">
                      {approvalRate}%
                    </p>
                    <p className="text-[10px] text-neutral-550 font-semibold uppercase">
                      {approvedCount} Approved / {totalReviewed} Reviewed
                    </p>
                  </div>
                  {/* Custom Progress Bar */}
                  <div className="w-full bg-neutral-850 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${approvalRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Higher approval rates indicate smooth agent alignment with your startup goals.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500 text-center">
                  No approvals yet
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Runway Trend */}
          <div className="rounded-xl border border-neutral-850 bg-neutral-900/10 p-5 flex flex-col justify-between h-[280px]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Runway Trend</h3>
              <p className="text-[10px] text-neutral-550 mt-0.5">Startup runway projections over time (months)</p>
            </div>
            <div className="flex-1 min-h-0 mt-4 flex items-center justify-center">
              {hasEnoughRunwayData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={runwayData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} />
                    <YAxis stroke="#525252" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#262626' }}
                      labelStyle={{ color: '#d4d4d4', fontSize: 10 }}
                      itemStyle={{ color: '#22c55e', fontSize: 10 }}
                    />
                    <Line type="monotone" dataKey="runway" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-neutral-500 text-center px-4 leading-relaxed">
                  Log more snapshots on the Finance page to see runway trends
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
