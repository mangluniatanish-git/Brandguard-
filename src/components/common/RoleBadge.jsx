import React from 'react';
import { PenTool, CheckCircle, BarChart3, ShieldCheck } from 'lucide-react';

export default function RoleBadge({ role, className = '' }) {
  const configs = {
    creator: {
      label: 'Creator',
      icon: PenTool,
      bg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    },
    reviewer: {
      label: 'Reviewer',
      icon: CheckCircle,
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    },
    manager: {
      label: 'Manager',
      icon: BarChart3,
      bg: 'bg-neutral-100 text-neutral-800 border-neutral-300',
    },
    admin: {
      label: 'Admin',
      icon: ShieldCheck,
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-semibold',
    },
  };

  const config = configs[role] || configs.creator;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium border ${config.bg} ${className}`}
      aria-label={`Role: ${config.label}`}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
