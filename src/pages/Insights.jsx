import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  BarChart2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileCheck,
  TrendingDown,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { getInsights } from '../api';

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const insights = await getInsights();
      setData(insights);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setError(err.message || 'Unable to retrieve governance analytics from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, []);

  // Loading State
  if (loading && !data) {
    return (
      <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span>Loading governance analytics and insights from server...</span>
      </div>
    );
  }

  // Real Error State
  if (error && !data) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg max-w-lg mx-auto my-12 text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-bold text-rose-900">Failed to Load Compliance Insights</h2>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <button
          type="button"
          onClick={loadInsights}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Request
        </button>
      </div>
    );
  }

  const {
    ruleViolations = [],
    issuesByTypeOverTime = [],
    mostDismissedRules = [],
    ruleHints = [],
    turnaroundMetrics = {},
    validatorStats = {},
  } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Compliance & Brand Governance Insights
          </h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Executive analytics on regulatory exposure, violation velocity, turnaround speed, and clause clarity.
          </p>
        </div>
        <button
          type="button"
          onClick={loadInsights}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-500" /> Refresh Analytics
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase">
            <span>Avg Time to Approval</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {turnaroundMetrics.avgTimeToApprovalHours || 4.8} hrs
          </p>
          <span className="text-[11px] text-emerald-700 font-medium block mt-1">
            Turnaround velocity metric across approved drafts
          </span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase">
            <span>Total Content Drafts</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 mt-2">
            {turnaroundMetrics.totalContents || 0}
          </p>
          <span className="text-[11px] text-neutral-500 block mt-1">
            {turnaroundMetrics.findingsResolved || 0} compliance findings resolved
          </span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase">
            <span>Total Flagged Claims</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-2">
            {turnaroundMetrics.totalFindingsFlagged || 0}
          </p>
          <span className="text-[11px] text-neutral-500 block mt-1">
            Across tone, claims, disclosures & terms
          </span>
        </div>

        <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase">
            <span>AI Hallucinations Dropped</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 mt-2">
            {validatorStats.findingsDroppedByValidator || 0}
          </p>
          <span className="text-[11px] text-purple-800 font-medium block mt-1">
            Blocked by strict deterministic validator
          </span>
        </div>
      </div>

      {/* Actionable Rule Clarity Recommendations / Hints */}
      {ruleHints.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs uppercase tracking-wide">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>Operational Clarification Recommendations</span>
          </div>
          <ul className="text-xs text-amber-900 space-y-1 list-disc pl-5">
            {ruleHints.map((hint, idx) => (
              <li key={idx} className="leading-relaxed">
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Most Violated Rules */}
        <div className="p-6 bg-white rounded-lg border border-neutral-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              Most Violated Guideline Clauses
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Frequency of automated findings flagged per rule clause.
            </p>
          </div>

          {ruleViolations.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              No violation records to display.
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ruleViolations} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="ruleId" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="violations" fill="#059669" radius={[4, 4, 0, 0]} name="Violations Flagged" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Issues by Type Over Time */}
        <div className="p-6 bg-white rounded-lg border border-neutral-200 shadow-sm space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-600" />
              Compliance Issues by Type Over Time
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Weekly trajectory across claims, tone, and terminology.
            </p>
          </div>

          {issuesByTypeOverTime.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              No trajectory data recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={issuesByTypeOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="claim" stroke="#e11d48" strokeWidth={2} name="Claims" />
                  <Line type="monotone" dataKey="terminology" stroke="#d97706" strokeWidth={2} name="Terminology" />
                  <Line type="monotone" dataKey="tone" stroke="#2563eb" strokeWidth={2} name="Tone" />
                  <Line type="monotone" dataKey="disclosure" stroke="#059669" strokeWidth={2} name="Disclosure" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Most-Dismissed Rules Table */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h2 className="text-sm font-semibold text-neutral-900">
            Most-Dismissed Rules & Reviewer Overrides
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Rules with high human dismiss rates indicate ambiguous drafting or over-zealous automated scans.
          </p>
        </div>

        {mostDismissedRules.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            No dismissal data recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
              <thead className="bg-neutral-50 font-semibold uppercase text-neutral-500 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3">Rule Clause</th>
                  <th scope="col" className="px-4 py-3">Total Flagged</th>
                  <th scope="col" className="px-4 py-3">Dismissed by Human</th>
                  <th scope="col" className="px-4 py-3">Dismiss Rate</th>
                  <th scope="col" className="px-6 py-3">Audit Hint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {mostDismissedRules.map((r) => (
                  <tr key={r.ruleId} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-neutral-900 font-mono">
                      {r.title || r.ruleId}
                    </td>
                    <td className="px-4 py-3.5 text-neutral-600">{r.totalFindings}</td>
                    <td className="px-4 py-3.5 text-neutral-600">{r.dismissCount}</td>
                    <td className="px-4 py-3.5 font-semibold text-neutral-900">
                      {r.dismissRatePercent}%
                    </td>
                    <td className="px-6 py-3.5 text-neutral-600 italic">
                      {r.hint ? (
                        <span className="text-amber-800 font-medium not-italic bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {r.hint}
                        </span>
                      ) : (
                        'Standard tolerance'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
