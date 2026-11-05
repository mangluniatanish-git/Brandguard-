import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, ArrowRight, PlusCircle, AlertCircle, Loader2, CheckCircle2, RefreshCw } from 'lucide-react';
import { listContent } from '../api';
import { useAuth } from '../context/AuthContext';

export default function MyContent() {
  const { currentUser } = useAuth();
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMyContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listContent();
      // Creator sees their content; Admin sees all
      const filtered = currentUser?.role === 'admin'
        ? (Array.isArray(data) ? data : [])
        : (Array.isArray(data) ? data : []).filter(
            (c) => c.creatorId === currentUser?.id || c.creator === currentUser?.name || c.creatorRole === 'creator'
          );
      setContents(filtered);
    } catch (err) {
      console.error('Failed to load my content:', err);
      setError(err.message || 'Unable to retrieve your content drafts from server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadMyContent();
    }
  }, [currentUser?.role, currentUser?.name, currentUser?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">My Content</h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Your draft campaigns, social posts, and submitted marketing copy.
          </p>
        </div>
        <Link
          to="/new-content"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          New Submission
        </Link>
      </div>

      {/* Real Error State */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start justify-between gap-3 text-sm text-rose-800" role="alert">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Failed to load content list</p>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadMyContent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-rose-300 text-rose-800 rounded hover:bg-rose-100 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span>Loading your content drafts from server...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {contents.length === 0 ? (
            <div className="py-12 px-6 text-center text-sm text-neutral-500">
              <FolderOpen className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-neutral-700">No content drafts submitted yet</p>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Click the button below to draft or upload copy for automated compliance checking.
              </p>
              <Link
                to="/new-content"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Check New Content
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {contents.map((item) => (
                <div key={item.id} className="p-5 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{item.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                      <span>{item.channel}</span>
                      <span>•</span>
                      <span>{item.rulePack}</span>
                      <span>•</span>
                      <span>{(item.findings || []).length} violations</span>
                      <span>•</span>
                      <span>Version {item.versions?.length || 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        item.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : item.status === 'Changes Requested'
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : 'bg-neutral-100 text-neutral-800 border-neutral-200'
                      }`}
                    >
                      {item.status}
                    </span>
                    <Link
                      to={`/review/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Open Review <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
