'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Users, DollarSign, Scale, Megaphone } from 'lucide-react';

const FOUNDER_ID = '8bbb8137-73b7-4e07-b154-6d0b8034532f';

type FounderProfile = {
  name: string;
  startup_name: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<FounderProfile | null>(null);

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
    fetchProfile();
  }, []);

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Hiring', href: '/hiring', icon: Users },
    { label: 'Finance', href: '/finance', icon: DollarSign },
    { label: 'Legal', href: '/legal', icon: Scale },
    { label: 'GTM', href: '/gtm', icon: Megaphone },
  ];

  // Get initials for profile avatar fallback
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

      {/* Profile Section */}
      <div className="mt-auto border-t border-neutral-800/80 pt-4">
        {profile ? (
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-semibold text-neutral-300">
              {getInitials(profile.name)}
            </div>
            <div className="min-w-0">
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
