'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, DollarSign, Scale, Megaphone, Sparkles, BarChart3, CalendarDays } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type FounderProfile = {
  name: string;
  startup_name: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [scores, setScores] = useState({
    overall: 82,
    product: 85,
    finance: 78,
    team: 80,
    legal: 90,
    marketing: 60
  });

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('founder_profile')
        .select('name, startup_name')
        .eq('id', FOUNDER_ID)
        .single();
      if (!error && data) {
        setProfile(data as FounderProfile);
      }
    }

    async function fetchHealthMetrics() {
      // 1. Fetch runway to calculate Finance score
      const { data: financeData } = await supabase
        .from('finance_snapshots')
        .select('runway_months')
        .eq('founder_id', FOUNDER_ID)
        .order('created_at', { ascending: false })
        .limit(1);

      let financeScore = 75; // baseline
      if (financeData && financeData.length > 0) {
        const runway = financeData[0].runway_months;
        if (runway >= 18) financeScore = 95;
        else if (runway >= 12) financeScore = 85;
        else if (runway >= 6) financeScore = 65;
        else financeScore = 40;
      }

      // 2. Fetch agent actions to calculate GTM (Marketing), Hiring (Team), and Legal scores
      const { data: actionsData } = await supabase
        .from('agent_actions')
        .select('agent_type, status')
        .eq('founder_id', FOUNDER_ID);

      let productCount = 0;
      let productApproved = 0;
      let legalCount = 0;
      let legalApproved = 0;
      let hiringCount = 0;
      let hiringApproved = 0;
      let gtmCount = 0;
      let gtmPosted = 0;

      if (actionsData) {
        actionsData.forEach(act => {
          if (act.agent_type === 'legal') {
            legalCount++;
            if (act.status === 'approved' || act.status === 'posted') legalApproved++;
          } else if (act.agent_type === 'hiring') {
            hiringCount++;
            if (act.status === 'approved' || act.status === 'posted') hiringApproved++;
          } else if (act.agent_type === 'gtm') {
            gtmCount++;
            if (act.status === 'posted') gtmPosted++;
          } else {
            productCount++;
            if (act.status === 'approved' || act.status === 'posted') productApproved++;
          }
        });
      }

      // Calculate scores dynamically (ensure a baseline of 60 if no drafts exist)
      const legalScore = legalCount > 0 ? Math.round((legalApproved / legalCount) * 40 + 60) : 90;
      const teamScore = hiringCount > 0 ? Math.round((hiringApproved / hiringCount) * 40 + 60) : 80;
      const marketingScore = gtmCount > 0 ? Math.round((gtmPosted / gtmCount) * 50 + 50) : 60;
      const productScore = productCount > 0 ? Math.round((productApproved / productCount) * 30 + 70) : 85;

      const overallScore = Math.round((productScore + financeScore + teamScore + legalScore + marketingScore) / 5);

      setScores({
        overall: overallScore,
        product: productScore,
        finance: financeScore,
        team: teamScore,
        legal: legalScore,
        marketing: marketingScore
      });
    }

    fetchProfile();
    fetchHealthMetrics();
  }, [pathname]);

  const navItems = [
    { label: 'Oni', href: '/oni', icon: Sparkles },
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Calendar', href: '/calendar', icon: CalendarDays },
    { label: 'Hiring', href: '/hiring', icon: Users },
    { label: 'Finance', href: '/finance', icon: DollarSign },
    { label: 'Legal', href: '/legal', icon: Scale },
    { label: 'GTM', href: '/gtm', icon: Megaphone },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'FP';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 px-4 py-6">
      {/* Brand Header */}
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 font-bold text-neutral-950">
          Δ
        </div>
        <span className="text-lg font-bold tracking-tight text-neutral-50">Delta</span>
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition duration-150 ${
                isActive
                  ? 'bg-neutral-900 text-neutral-50'
                  : 'text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Startup Health Score Widget */}
      <div className="mt-auto border-t border-neutral-900 pt-5 pb-3 px-2 space-y-3.5">
        <div className="flex items-center gap-3">
          {/* Circular SVG Progress */}
          <div className="relative h-11 w-11 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-neutral-900"
                strokeWidth="3.2"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-green-500"
                strokeWidth="3.2"
                strokeDasharray={`${scores.overall}, 100`}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-[10px] font-bold text-green-400">{scores.overall}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-300">Health Score</p>
            {scores.overall >= 80 ? (
              <span className="inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[9px] font-bold text-green-400 border border-green-500/10 uppercase tracking-wider scale-95 origin-left">
                ✓ Healthy
              </span>
            ) : scores.overall >= 60 ? (
              <span className="inline-block rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-500/10 uppercase tracking-wider scale-95 origin-left">
                ⚠ At Risk
              </span>
            ) : (
              <span className="inline-block rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-bold text-red-400 border border-red-500/10 uppercase tracking-wider scale-95 origin-left">
                ✕ Critical
              </span>
            )}
          </div>
        </div>

        {/* Compact Metrics list */}
        <div className="space-y-2 text-[10px] pr-1">
          {[
            { label: 'Product', value: scores.product, color: scores.product >= 80 ? 'bg-green-500' : scores.product >= 60 ? 'bg-amber-500' : 'bg-red-500' },
            { label: 'Finance', value: scores.finance, color: scores.finance >= 80 ? 'bg-green-500' : scores.finance >= 60 ? 'bg-amber-500' : 'bg-red-500' },
            { label: 'Team', value: scores.team, color: scores.team >= 80 ? 'bg-green-500' : scores.team >= 60 ? 'bg-amber-500' : 'bg-red-500' },
            { label: 'Legal', value: scores.legal, color: scores.legal >= 80 ? 'bg-green-500' : scores.legal >= 60 ? 'bg-amber-500' : 'bg-red-500' },
            { label: 'Marketing', value: scores.marketing, color: scores.marketing >= 80 ? 'bg-green-500' : scores.marketing >= 60 ? 'bg-amber-500' : 'bg-red-500' },
          ].map((m) => (
            <div key={m.label} className="space-y-0.5">
              <div className="flex justify-between text-neutral-450 font-medium">
                <span>{m.label}</span>
                <span>{m.value}%</span>
              </div>
              <div className="h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Section */}
      <div className="border-t border-neutral-900 pt-4 shrink-0">
        {profile ? (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-neutral-300">
              {getInitials(profile.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-200">{profile.name}</p>
              <p className="truncate text-xs text-neutral-500">{profile.startup_name}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 animate-pulse">
            <div className="h-9 w-9 rounded-full bg-neutral-900" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded bg-neutral-900" />
              <div className="h-2 w-16 rounded bg-neutral-900" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
