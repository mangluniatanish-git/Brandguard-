import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  MessageSquare,
  ShieldAlert,
  X,
  Send,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { listContent, setStatus } from '../api';
import { useAuth } from '../context/AuthContext';

export default function ReviewQueue() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states for action decision
  const [activeActionItem, setActiveActionItem] = useState(null);
  const [actionType, setActionType] = useState(null); // 'Approved' | 'Changes Requested'
  const [actionComment, setActionComment] = useState('');
  const [approvalError, setApprovalError] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContent();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load review queue:', err);
      setError(err.message || 'Unable to retrieve review queue items from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'All') return true;
    return item.status === statusFilter;
  });

  const handleOpenActionModal = (item, type) => {
    setActiveActionItem(item);
    setActionType(type);
    setActionComment('');
    setApprovalError(null);

    // If approving, pre-validate high-severity findings
    if (type === 'Approved') {
      const openHigh = (item.findings || []).filter(
        (f) => f.severity === 'high' && (f.status === 'open' || !f.status)
      );
      if (openHigh.length > 0) {
        setApprovalError(
          `Approval blocked: ${openHigh.length} high-severity claim(s) remain unresolved (${openHigh.map((f) => f.ruleId).join(', ')}). Resolve or dismiss them on the review screen first.`
        );
      }
    }
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!activeActionItem || !actionType) return;

    if (actionType === 'Changes Requested' && !actionComment.trim()) {
      setApprovalError('A comment is required when requesting changes.');
      return;
    }

    try {
      setSubmittingAction(true);
      setApprovalError(null);
      await setStatus(
        activeActionItem.id,
        actionType,
        actionComment,
        currentUser?.name || 'Reviewer'
      );
      setActiveActionItem(null);
      await loadData();
    } catch (err) {
      console.error('Failed to update status', err);
      setApprovalError(err.message || 'Status update failed on the server');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Review Queue</h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Compliance inbox for human verification, regulatory claim approval, and change requests.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
          <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          <span>Active Role: {currentUser?.roleTitle || currentUser?.role}</span>
        </div>
      </div>

      {/* Real Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3 text-sm text-rose-800" role="alert">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load review queue</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-800 rounded hover:bg-rose-100 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2 text-xs">
        <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
        <span className="font-semibold text-neutral-500 uppercase tracking-wide mr-2">Status:</span>
        {['All', 'AI Reviewed', 'In Human Review', 'Changes Requested', 'Approved'].map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === status
                ? 'bg-emerald-600 text-white font-semibold'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading queue items from server...</span>
        </div>
      ) : (
        /* Table of Items */
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              <CheckCircle className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-neutral-700">No content items found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {statusFilter === 'All' ? 'No content has been submitted yet' : `No content currently in "${statusFilter}" state`}
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
                    <th scope="col" className="px-4 py-3">Open Violations</th>
                    <th scope="col" className="px-6 py-3 text-right">Human Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {filteredItems.map((item) => {
                    const openHigh = (item.findings || []).filter(
                      (f) => f.severity === 'high' && (f.status === 'open' || !f.status)
                    );
                    const canApprove = openHigh.length === 0;

                    return (
                      <tr key={item.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-neutral-900">
                          <Link to={`/review/${item.id}`} className="hover:text-emerald-700 font-semibold block">
                            {item.title}
                          </Link>
                          <span className="text-xs text-neutral-500 block mt-0.5">
                            Author: {item.creator || 'Creator'} • Version {item.versions?.length || 1}
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
                          {openHigh.length > 0 ? (
                            <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {openHigh.length} High Severity
                            </span>
                          ) : (item.findings || []).length > 0 ? (
                            <span className="text-amber-700">
                              {(item.findings || []).length} findings (0 high)
                            </span>
                          ) : (
                            <span className="text-emerald-700 inline-flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> 0 issues
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Link
                            to={`/review/${item.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
                          >
                            Review
                          </Link>
                          {currentUser?.role !== 'creator' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(item, 'Changes Requested')}
                                className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100"
                              >
                                Request Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenActionModal(item, 'Approved')}
                                className={`px-2.5 py-1 text-xs font-medium rounded ${
                                  canApprove
                                    ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                                    : 'text-neutral-400 bg-neutral-100 border border-neutral-200 cursor-not-allowed'
                                }`}
                                title={canApprove ? 'Approve content' : 'Blocked by high-severity findings'}
                              >
                                Approve
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Decision Modal for Approve / Changes Requested */}
      {activeActionItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {actionType === 'Approved' ? 'Confirm Brand Approval' : 'Request Content Changes'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveActionItem(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              Applying state transition for: <strong>"{activeActionItem.title}"</strong>
            </p>

            {approvalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{approvalError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmAction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Reviewer Notes / Feedback{' '}
                  {actionType === 'Changes Requested' && <span className="text-rose-600">* (Mandatory)</span>}
                </label>
                <textarea
                  rows={4}
                  required={actionType === 'Changes Requested'}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={
                    actionType === 'Changes Requested'
                      ? 'Explain required revisions, missing disclaimers, or unverified claims...'
                      : 'Optional approval notes or sign-off audit comments...'
                  }
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setActiveActionItem(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction || (actionType === 'Approved' && !!approvalError)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white rounded transition-colors disabled:opacity-50 ${
                    actionType === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {actionType === 'Approved' ? 'Confirm Approval' : 'Submit Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
