import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { listContent } from '../api';
import { useAuth } from '../context/AuthContext';
import RoleBadge from '../components/common/RoleBadge';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContent();
      setContents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Unable to retrieve content items from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser?.role, currentUser?.name]);

  const counts = {
    total: contents.length,
    draft: contents.filter((c) => c.status === 'Draft').length,
    aiReviewed: contents.filter((c) => c.status === 'AI Reviewed').length,
    inReview: contents.filter((c) => c.status === 'In Human Review').length,
    changesRequested: contents.filter((c) => c.status === 'Changes Requested').length,
    approved: contents.filter((c) => c.status === 'Approved').length,
  };

  const myPendingItems = contents.filter((c) => {
    if (currentUser?.role === 'creator') {
      return (c.creatorId === currentUser?.id || c.creator === currentUser?.name) || c.status === 'Changes Requested';
    }
    if (currentUser?.role === 'reviewer') {
      return c.status === 'In Human Review' || c.status === 'AI Reviewed';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Overview of brand compliance status, review queues, and pending content items.
          </p>
        </div>
        {(currentUser?.role === 'creator' || currentUser?.role === 'admin') && (
          <Link
            to="/new-content"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none transition-colors"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            Check New Content
          </Link>
        )}
      </div>

      {/* Real Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3 text-sm text-rose-800" role="alert">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load dashboard data</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-800 rounded-md hover:bg-rose-100 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="py-16 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading content statistics from server...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Status Counters Grid */}
          <section aria-labelledby="status-metrics-heading">
            <h2 id="status-metrics-heading" className="sr-only">Content Status Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <span className="text-xs font-medium text-neutral-500">Draft</span>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{counts.draft}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <span className="text-xs font-medium text-neutral-500">AI Reviewed</span>
                <p className="text-2xl font-bold text-neutral-900 mt-1">{counts.aiReviewed}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <span className="text-xs font-medium text-amber-700">In Human Review</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">{counts.inReview}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <span className="text-xs font-medium text-rose-700">Changes Requested</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">{counts.changesRequested}</p>
              </div>
              <div className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm">
                <span className="text-xs font-medium text-emerald-700">Approved</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{counts.approved}</p>
              </div>
            </div>
          </section>

          {/* Pending Items Table */}
          <section aria-labelledby="pending-heading" className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h2 id="pending-heading" className="text-base font-semibold text-neutral-900">
                  {currentUser?.role === 'creator' ? 'My Action Items' : 'Active Review Queue'}
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Content requiring verification, editorial revisions, or regulatory sign-off.
                </p>
              </div>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-neutral-100 text-neutral-700">
                {myPendingItems.length} items
              </span>
            </div>

            {/* Empty State */}
            {myPendingItems.length === 0 ? (
              <div className="py-12 px-6 text-center text-sm text-neutral-500">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
                <p className="font-medium text-neutral-800">All caught up!</p>
                <p className="text-xs text-neutral-500 mt-1">
                  No pending content items requiring your attention right now.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                  <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3">Campaign / Copy Title</th>
                      <th scope="col" className="px-4 py-3">Channel</th>
                      <th scope="col" className="px-4 py-3">Jurisdiction</th>
                      <th scope="col" className="px-4 py-3">Status</th>
                      <th scope="col" className="px-4 py-3">Findings</th>
                      <th scope="col" className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {myPendingItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          <Link to={`/review/${item.id}`} className="hover:text-emerald-700 font-semibold block">
                            {item.title}
                          </Link>
                          <span className="text-xs text-neutral-500 block mt-0.5">
                            By {item.creator || 'Author'} • {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-neutral-700">{item.channel}</td>
                        <td className="px-4 py-4 text-xs text-neutral-500">{item.rulePack}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              item.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'Changes Requested'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-medium">
                          {(item.findings || []).length > 0 ? (
                            <span className="text-rose-700 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {(item.findings || []).length} violations
                            </span>
                          ) : (
                            <span className="text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-medium">
                          <Link
                            to={`/review/${item.id}`}
                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
                          >
                            Inspect <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
