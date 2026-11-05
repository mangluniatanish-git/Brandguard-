import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Send,
  History,
  FileText,
  X,
  ExternalLink,
  ChevronRight,
  User,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getContent, updateContent, updateFinding, addComment, setStatus, runReview } from '../api';
import { useBrand } from '../context/BrandContext';
import { useAuth } from '../context/AuthContext';

export default function ReviewScreen() {
  const { id } = useParams();
  const { brand } = useBrand();
  const { currentUser } = useAuth();

  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFindingId, setSelectedFindingId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [reAnalyzing, setReAnalyzing] = useState(false);

  // Drawer for rule clause inspect
  const [drawerClause, setDrawerClause] = useState(null);

  // Dismiss modal state
  const [dismissingFinding, setDismissingFinding] = useState(null);
  const [dismissalReason, setDismissalReason] = useState('');

  // Edit finding modal state
  const [editingFinding, setEditingFinding] = useState(null);
  const [editedSuggestion, setEditedSuggestion] = useState('');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Bottom section active tab
  const [bottomTab, setBottomTab] = useState('comments'); // 'comments' | 'versions' | 'activity'

  // View mode for content copy box: 'inline' (diff/strikethrough) | 'clean' (clean applied text) | 'raw' (original draft)
  const [previewMode, setPreviewMode] = useState('inline');
  const [savingVersion, setSavingVersion] = useState(false);

  // Status transition states
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [changeComment, setChangeComment] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetId = id || 'cnt-01';
      const data = await getContent(targetId);
      setContent(data);
    } catch (err) {
      console.error('Failed to load review content:', err);
      setError(err.message || 'Unable to load content item for review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Loading State
  if (loading && !content) {
    return (
      <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span>Loading compliance review workspace...</span>
      </div>
    );
  }

  // Real Error State
  if (error && !content) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg max-w-lg mx-auto my-12 text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-bold text-rose-900">Review Item Not Found</h2>
        <p className="text-xs text-rose-700 mt-1">{error}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50"
          >
            Back to Dashboard
          </Link>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const findings = content.findings || [];
  const guidelines = brand?.guidelines || [];

  // Helper to get rule details for the side drawer
  const handleOpenClauseDrawer = (ruleId) => {
    const clause = guidelines.find((g) => g.id === ruleId);
    if (clause) {
      setDrawerClause(clause);
    } else {
      setDrawerClause({
        id: ruleId,
        title: 'Regulatory Rule Reference',
        category: 'Statutory Standard',
        text: `Compliance clause ${ruleId} governing advertising substantiation and fair competition standards.`,
      });
    }
  };

  // Scroll to finding card
  const handleHighlightClick = (findingId) => {
    setSelectedFindingId(findingId);
    const el = document.getElementById(`card-${findingId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Accept Finding
  const handleAcceptFinding = async (finding) => {
    try {
      setActionError(null);
      await updateFinding(content.id, finding.id, {
        status: 'accepted',
        action: 'accepted',
        actor: currentUser?.name || 'Reviewer',
      });
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to accept finding');
    }
  };

  // Dismiss Finding
  const handleDismissSubmit = async (e) => {
    e.preventDefault();
    if (!dismissalReason.trim()) return;

    try {
      setActionError(null);
      await updateFinding(content.id, dismissingFinding.id, {
        status: 'dismissed',
        action: 'dismissed',
        dismissalReason: dismissalReason.trim(),
        actor: currentUser?.name || 'Reviewer',
      });

      setDismissingFinding(null);
      setDismissalReason('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to dismiss finding');
    }
  };

  // Edit Finding
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionError(null);
      await updateFinding(content.id, editingFinding.id, {
        status: 'edited',
        action: 'edited',
        suggestion: editedSuggestion,
        finalText: editedSuggestion,
        actor: currentUser?.name || 'Reviewer',
      });

      setEditingFinding(null);
      setEditedSuggestion('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to save edit');
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setCommentSubmitting(true);
      setActionError(null);
      await addComment(content.id, {
        author: currentUser?.name || 'Reviewer',
        role: currentUser?.role || 'reviewer',
        text: newComment.trim(),
      });
      setNewComment('');
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to post comment');
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Re-run compliance pipeline
  const handleReRunReview = async () => {
    try {
      setReAnalyzing(true);
      setActionError(null);
      await runReview(content.id);
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to execute review pipeline');
    } finally {
      setReAnalyzing(false);
    }
  };

  // Compute clean copy text with accepted suggestions applied
  const computeCleanText = () => {
    let clean = content?.text || '';
    const acceptedFindings = (content?.findings || []).filter(
      (f) => f.status === 'accepted' && (f.finalText || f.suggestion) && f.quote
    );
    acceptedFindings.forEach((f) => {
      const replacement = f.finalText || f.suggestion;
      if (clean.includes(f.quote)) {
        clean = clean.split(f.quote).join(replacement);
      }
    });
    return clean;
  };

  // Save revised text as next content version
  const handleSaveRevisedVersion = async () => {
    try {
      setSavingVersion(true);
      setActionError(null);
      const cleanText = computeCleanText();
      const acceptedCount = findings.filter((f) => f.status === 'accepted').length;
      await updateContent(content.id, {
        text: cleanText,
        summary: `Applied ${acceptedCount} approved compliance revisions`,
      });
      await loadData();
    } catch (err) {
      setActionError(err.message || 'Failed to save revised content version');
    } finally {
      setSavingVersion(false);
    }
  };

  // Transition status handler
  const handleTransitionStatus = async (nextStatus, comment = '') => {
    try {
      setStatusLoading(true);
      setActionError(null);
      await setStatus(content.id, nextStatus, comment, currentUser?.name);
      await loadData();
      if (requestingChanges) {
        setRequestingChanges(false);
        setChangeComment('');
      }
    } catch (err) {
      setActionError(err.message || `Failed to transition status to ${nextStatus}`);
    } finally {
      setStatusLoading(false);
    }
  };

  // Process findings with real offsets and fallback quote search
  const text = content?.text || '';
  const processedFindings = [];
  let mismatchedOffsetCount = 0;

  findings.forEach((f) => {
    if (!f.quote || typeof f.quote !== 'string') return;

    let effectiveStart = f.start;
    let effectiveEnd = f.end;
    let offsetMismatched = false;

    // 1. Highlight quotes using the start/end offsets from the real findings
    if (
      typeof effectiveStart === 'number' &&
      typeof effectiveEnd === 'number' &&
      effectiveStart >= 0 &&
      effectiveEnd <= text.length &&
      text.slice(effectiveStart, effectiveEnd) === f.quote
    ) {
      offsetMismatched = false;
    } else {
      // 2. If offsets do not match the text, fall back to searching the quote and show a warning
      const searchIdx = text.indexOf(f.quote);
      if (searchIdx !== -1) {
        effectiveStart = searchIdx;
        effectiveEnd = searchIdx + f.quote.length;
        offsetMismatched = true;
        mismatchedOffsetCount++;
      } else {
        return;
      }
    }

    processedFindings.push({
      ...f,
      effectiveStart,
      effectiveEnd,
      offsetMismatched,
    });
  });

  // Render highlighted text with exact quote matching & overlap handling
  const renderHighlightedText = () => {
    if (!text) return null;
    if (!processedFindings.length) return <span>{text}</span>;

    if (previewMode === 'clean') {
      return computeCleanText();
    }

    if (previewMode === 'raw') {
      return text;
    }

    // Overlapping findings handled without breaking text:
    // Gather all distinct atomic boundary split points
    const splitPoints = new Set([0, text.length]);
    processedFindings.forEach((f) => {
      splitPoints.add(f.effectiveStart);
      splitPoints.add(f.effectiveEnd);
    });

    const sortedPoints = Array.from(splitPoints).sort((a, b) => a - b);
    const segments = [];
    const severityRank = { high: 3, medium: 2, low: 1 };

    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const pStart = sortedPoints[i];
      const pEnd = sortedPoints[i + 1];
      const sliceText = text.substring(pStart, pEnd);
      if (!sliceText) continue;

      const covering = processedFindings.filter(
        (f) => f.effectiveStart <= pStart && f.effectiveEnd >= pEnd
      );

      if (covering.length === 0) {
        segments.push(<span key={`seg-${pStart}-${pEnd}`}>{sliceText}</span>);
      } else {
        const selectedMatch = covering.find((f) => f.id === selectedFindingId);
        const dominant =
          selectedMatch ||
          covering.slice().sort((a, b) => (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0))[0];

        const isSelected = covering.some((f) => f.id === selectedFindingId);
        const isAccepted = dominant.status === 'accepted';
        const isDismissed = dominant.status === 'dismissed';

        let style = 'bg-blue-100 text-blue-950 border-b-2 border-blue-600 font-medium';
        if (isAccepted) {
          style = 'bg-emerald-100 text-emerald-950 border-b-2 border-emerald-600 font-medium';
        } else if (isDismissed) {
          style = 'line-through opacity-50 bg-neutral-200 text-neutral-700';
        } else if (dominant.severity === 'high') {
          style = 'bg-rose-100 text-rose-950 border-b-2 border-rose-600 font-medium';
        } else if (dominant.severity === 'medium') {
          style = 'bg-amber-100 text-amber-950 border-b-2 border-amber-600 font-medium';
        }

        const overlapNotice = covering.length > 1 ? ` (${covering.length} overlapping rules)` : '';

        segments.push(
          <mark
            key={`mark-${pStart}-${pEnd}`}
            onClick={() => handleHighlightClick(dominant.id)}
            className={`px-1 py-0.5 rounded cursor-pointer transition-all ${style} ${
              isSelected ? 'ring-2 ring-emerald-600 ring-offset-1 font-bold' : 'hover:opacity-90'
            }`}
            title={`[${dominant.ruleId}] ${dominant.ruleTitle}${overlapNotice}`}
          >
            {isAccepted ? (
              <>
                <span className="line-through text-neutral-400 mr-1 text-xs">{sliceText}</span>
                <span className="font-semibold text-emerald-900 underline decoration-emerald-500">
                  {dominant.finalText || dominant.suggestion || sliceText}
                </span>
              </>
            ) : (
              sliceText
            )}
          </mark>
        );
      }
    }

    return segments;
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 hover:bg-neutral-100"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{content.title}</h1>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  content.status === 'Approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : content.status === 'Changes Requested'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {content.status}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Channel: <span className="text-neutral-800 font-medium">{content.channel}</span> • Rule Pack:{' '}
              <span className="text-neutral-800 font-medium">{content.rulePack}</span> • Creator:{' '}
              <span className="text-neutral-800 font-medium">{content.creator}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Re-run Scan Button */}
          <button
            type="button"
            onClick={handleReRunReview}
            disabled={reAnalyzing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            {reAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" /> Re-scanning...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-neutral-500" /> Re-run Scan
              </>
            )}
          </button>

          {/* Draft or AI Reviewed -> Send to Reviewer */}
          {(content.status === 'Draft' || content.status === 'AI Reviewed') && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleTransitionStatus('In Human Review', 'Draft sent to compliance team for human review')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send to Reviewer
            </button>
          )}

          {/* In Human Review -> Request Changes or Approve */}
          {content.status === 'In Human Review' && (
            <>
              <button
                type="button"
                disabled={statusLoading}
                onClick={() => setRequestingChanges(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-300 rounded hover:bg-rose-100 disabled:opacity-50 transition-colors shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Request Changes
              </button>

              <button
                type="button"
                disabled={statusLoading}
                onClick={() => {
                  const openHigh = (content.findings || []).filter(
                    (f) => f.severity === 'high' && (f.status === 'open' || !f.status)
                  );
                  if (openHigh.length > 0) {
                    setActionError(`Cannot approve: ${openHigh.length} high-severity finding(s) must be resolved (accepted or dismissed with reason) first.`);
                    return;
                  }
                  handleTransitionStatus('Approved', 'All high-severity compliance findings resolved. Approved for publication.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Approve Copy
              </button>
            </>
          )}

          {/* Changes Requested -> Resubmit */}
          {content.status === 'Changes Requested' && (
            <button
              type="button"
              disabled={statusLoading}
              onClick={() => handleTransitionStatus('In Human Review', 'Resubmitted after addressing reviewer feedback')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {statusLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Resubmit for Review
            </button>
          )}

          {/* Approved */}
          {content.status === 'Approved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Cleared for Publication
            </span>
          )}
        </div>
      </div>

      {/* Action / Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-xs text-rose-800" role="alert">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner Requirement */}
      {content.aiUsed === false ? (
        <div
          className="p-3 bg-amber-50 border border-amber-300 rounded-md flex items-center justify-between text-xs text-amber-950 font-medium shadow-sm"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>AI unavailable: rules-only results</span>
          </div>
          <span className="text-[11px] text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300 font-semibold">
            Rules Only
          </span>
        </div>
      ) : (
        <div
          className="p-3 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between text-xs text-emerald-950 font-medium shadow-sm"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>Analysed by AI (Gemini) via external API. Personal data is redacted before sending.</span>
          </div>
          <span className="text-[11px] text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
            Strict Redaction Active
          </span>
        </div>
      )}

      {/* Offsets Warning Banner */}
      {mismatchedOffsetCount > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-md flex items-start gap-2 text-xs text-amber-900 shadow-sm" role="alert">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Offset Alignment Notice: </span>
            <span>
              {mismatchedOffsetCount} finding offset(s) did not match the current copy text verbatim and were automatically re-aligned via exact quote search.
            </span>
          </div>
        </div>
      )}

      {/* Split Workspace: Left = Highlighted Content, Right = Findings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Content with Quotes Highlighted */}
        <section
          aria-labelledby="copy-heading"
          className="lg:col-span-6 bg-white rounded-lg border border-neutral-200 shadow-sm p-6 flex flex-col"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h2 id="copy-heading" className="text-sm font-semibold text-neutral-900">
                Content Copy under Review
              </h2>
              <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
                Scrollable
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Accepted
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> High
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Medium
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Low
              </span>
            </div>
          </div>

          {/* View Mode Switcher and Version Action */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 bg-neutral-100 p-1.5 rounded-md text-xs">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewMode('inline')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  previewMode === 'inline'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Inline Diff
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('clean')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  previewMode === 'clean'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Clean Revised Copy
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('raw')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  previewMode === 'raw'
                    ? 'bg-white text-emerald-800 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Original Draft
              </button>
            </div>

            {findings.some((f) => f.status === 'accepted') && (
              <button
                type="button"
                disabled={savingVersion}
                onClick={handleSaveRevisedVersion}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium shadow-sm transition-colors disabled:opacity-50 text-[11px]"
                title="Save copy with accepted corrections as the next document version"
              >
                {savingVersion ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Save as Version {(content.versions?.length || 1) + 1}
              </button>
            )}
          </div>

          {/* Compact Scrollable Container */}
          <div className="relative">
            <div className="max-h-[360px] overflow-y-auto pr-3 text-sm text-neutral-900 leading-relaxed font-sans whitespace-pre-wrap selection:bg-emerald-200 border border-neutral-300/80 rounded-md p-4 bg-neutral-50/60 shadow-inner">
              {renderHighlightedText()}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>Click any highlighted phrase to inspect its finding.</span>
            <span>{content.text?.length || 0} chars • Version {content.versions?.length || 1}</span>
          </div>
        </section>

        {/* Right Column: Findings Panel */}
        <section
          aria-labelledby="findings-heading"
          className="lg:col-span-6 space-y-4"
        >
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-neutral-200 shadow-sm">
            <div>
              <h2 id="findings-heading" className="text-sm font-semibold text-neutral-900">
                Compliance Findings ({findings.length})
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Review flagged claims against brand facts and statutory codes.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800">
              {findings.filter((f) => f.status === 'accepted').length} of {findings.length} Accepted
            </span>
          </div>

          {/* Empty Findings State */}
          {findings.length === 0 ? (
            <div className="p-8 bg-white rounded-lg border border-neutral-200 text-center shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-neutral-900">Zero Compliance Violations</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                No banned terminology, unsubstantiated scientific claims, or missing disclosures were flagged in this copy.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
              {findings.map((f) => {
                const isSelected = selectedFindingId === f.id;
                const isAccepted = f.status === 'accepted';
                const isDismissed = f.status === 'dismissed';
                const isEdited = f.status === 'edited';

                const severityConfig = {
                  high: { label: 'High Severity', bg: 'bg-rose-50 text-rose-900 border-rose-200', icon: AlertCircle },
                  medium: { label: 'Medium Severity', bg: 'bg-amber-50 text-amber-900 border-amber-200', icon: AlertTriangle },
                  low: { label: 'Low Severity', bg: 'bg-blue-50 text-blue-900 border-blue-200', icon: Info },
                };
                const sev = severityConfig[f.severity] || severityConfig.medium;
                const SevIcon = sev.icon;

                return (
                  <div
                    key={f.id}
                    id={`card-${f.id}`}
                    className={`p-4 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-600 shadow-md'
                        : isAccepted
                        ? 'bg-emerald-50/30 border-emerald-300'
                        : isDismissed
                        ? 'bg-neutral-50/70 border-neutral-200 opacity-60'
                        : 'bg-white border-neutral-200 shadow-sm'
                    }`}
                  >
                    {/* Card Header: Type badge, Severity, Low Confidence Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-800 uppercase tracking-wide">
                          {f.type}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${sev.bg}`}
                        >
                          <SevIcon className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{sev.label}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Requirement: "needs human check" badge when confidence is low */}
                        {(f.confidence === 'low' || f.needsHumanCheck) && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-900 border border-purple-200">
                            needs human check
                          </span>
                        )}

                        {/* Rule ID chip that opens the clause in a side drawer */}
                        <button
                          type="button"
                          onClick={() => handleOpenClauseDrawer(f.ruleId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors"
                          title="Inspect full guideline clause in side drawer"
                        >
                          <span>{f.ruleId}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Quoted Text */}
                    <div className="mt-3">
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
                        Flagged Quote:
                      </span>
                      <blockquote className="px-3 py-1.5 bg-neutral-50 border-l-4 border-rose-500 text-xs font-medium text-neutral-900 italic">
                        "{f.quote}"
                      </blockquote>
                    </div>

                    {/* Plain Language Explanation */}
                    <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                      {f.explanation}
                    </p>

                    {/* Mismatched Offset Warning */}
                    {processedFindings.find((pf) => pf.id === f.id)?.offsetMismatched && (
                      <div className="mt-2 px-2.5 py-1.5 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>Offsets in finding did not match text verbatim; re-aligned via exact quote search.</span>
                      </div>
                    )}

                    {/* Suggested Rewrite shown as a DIFF */}
                    {f.suggestion && (
                      <div className="mt-3 p-2.5 bg-neutral-50 rounded border border-neutral-200 text-xs font-mono">
                        <span className="text-[10px] uppercase font-bold text-neutral-500 block mb-1">
                          Suggested Rewrite Diff:
                        </span>
                        <div className="text-rose-700 bg-rose-50/70 px-2 py-1 rounded mb-1">
                          - {f.quote}
                        </div>
                        <div className="text-emerald-800 bg-emerald-50/70 px-2 py-1 rounded font-semibold">
                          + {f.finalText || f.suggestion}
                        </div>
                      </div>
                    )}

                    {/* Dismissal Reason Note if dismissed */}
                    {isDismissed && f.dismissalReason && (
                      <div className="mt-2.5 p-2 bg-neutral-100 rounded text-xs text-neutral-600 italic">
                        Dismissed reason: {f.dismissalReason}
                      </div>
                    )}

                    {/* Action Decision Buttons: Accept | Edit | Dismiss */}
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div className="text-xs text-neutral-500">
                        Status:{' '}
                        <strong className="text-neutral-900 font-semibold capitalize">
                          {f.status || 'open'}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAcceptFinding(f)}
                          disabled={isAccepted}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            isAccepted
                              ? 'bg-emerald-100 text-emerald-800 font-semibold'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accept
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingFinding(f);
                            setEditedSuggestion(f.finalText || f.suggestion);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            isEdited
                              ? 'bg-blue-100 text-blue-800 font-semibold'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDismissingFinding(f);
                            setDismissalReason('');
                          }}
                          disabled={isDismissed}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            isDismissed
                              ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed'
                              : 'bg-white border border-neutral-300 text-neutral-700 hover:bg-rose-50 hover:text-rose-700'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Below the Split: Tabs for Comments Thread, Version History with Side-by-Side Diff, Activity Log */}
      <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
        {/* Navigation Bar */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/60 px-6 pt-3 gap-6">
          <button
            type="button"
            onClick={() => setBottomTab('comments')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              bottomTab === 'comments'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Review Comments ({content.comments?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setBottomTab('versions')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              bottomTab === 'versions'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Version History & Side-by-Side Diff ({content.versions?.length || 1})
          </button>
          <button
            type="button"
            onClick={() => setBottomTab('activity')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
              bottomTab === 'activity'
                ? 'border-emerald-600 text-emerald-900 font-bold'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Activity Audit Log ({content.activityLog?.length || 0})
          </button>
        </div>

        {/* TAB 1: COMMENTS THREAD */}
        {bottomTab === 'comments' && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              {(!content.comments || content.comments.length === 0) ? (
                <p className="text-xs text-neutral-500 py-3 text-center">No comments posted yet.</p>
              ) : (
                content.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {comment.avatar || (comment.author ? comment.author.slice(0, 2).toUpperCase() : 'U')}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900">{comment.author}</span>
                        <span className="text-[11px] font-medium text-neutral-500 capitalize">
                          ({comment.role})
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 mt-1 leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2 pt-4 border-t border-neutral-200">
              <input
                type="text"
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add compliance notes or feedback for the creator..."
                className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <button
                type="submit"
                disabled={commentSubmitting || !newComment.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                {commentSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Post Comment
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: VERSION HISTORY WITH SIDE-BY-SIDE DIFF */}
        {bottomTab === 'versions' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <span className="text-xs text-neutral-500 font-medium">
                Comparing Version 1 (Initial Draft) with Version {content.versions?.length || 1} (Latest Revision):
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              {/* Version 1 */}
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-lg">
                <div className="flex items-center justify-between pb-2 border-b border-rose-200 mb-2 font-sans">
                  <span className="font-bold text-rose-900">Version 1 (Initial)</span>
                  <span className="text-[11px] text-rose-700">Author: {content.versions?.[0]?.author || content.creator}</span>
                </div>
                <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">
                  {content.versions?.[0]?.text || content.text}
                </p>
              </div>

              {/* Version 2 or Latest */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200 mb-2 font-sans">
                  <span className="font-bold text-emerald-900">
                    Version {content.versions?.length || 1} (Latest Revision)
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Author: {content.versions?.[content.versions.length - 1]?.author || content.creator}
                  </span>
                </div>
                <p className="text-neutral-800 leading-relaxed whitespace-pre-wrap">
                  {content.versions?.[content.versions.length - 1]?.text || content.text}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACTIVITY AUDIT LOG */}
        {bottomTab === 'activity' && (
          <div className="p-6">
            <div className="space-y-3">
              {(!content.activityLog || content.activityLog.length === 0) ? (
                <p className="text-xs text-neutral-500 py-3 text-center">No activity logged yet.</p>
              ) : (
                content.activityLog.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <Clock className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-neutral-900">{act.user}</span> —{' '}
                      <span className="text-neutral-700">{act.action}</span>
                      <span className="block text-[11px] text-neutral-400 mt-0.5">
                        {new Date(act.date).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* SIDE DRAWER: RULE CLAUSE INSPECT */}
      {drawerClause && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-neutral-900/40"
            onClick={() => setDrawerClause(null)}
            aria-hidden="true"
          />
          <aside
            className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-10 border-l border-neutral-200"
            aria-label="Guideline Clause Drawer"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded font-mono text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300">
                    {drawerClause.id}
                  </span>
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    {drawerClause.category || 'Standard'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerClause(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 space-y-4">
                <h3 className="text-base font-bold text-neutral-900">{drawerClause.title}</h3>
                <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-800 leading-relaxed">
                  {drawerClause.text}
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                    Enforcement Guidelines:
                  </h4>
                  <ul className="text-xs text-neutral-600 space-y-2 list-disc pl-4">
                    <li>Required compliance standard for all public marketing copy.</li>
                    <li>
                      Violations must be resolved or explicitly dismissed by a reviewer with clinical/legal justification before publication.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDrawerClause(null)}
              className="mt-6 w-full py-2 bg-neutral-100 text-neutral-800 font-semibold text-xs rounded hover:bg-neutral-200 transition-colors"
            >
              Close Drawer
            </button>
          </aside>
        </div>
      )}

      {/* DISMISS MODAL: REQUIRES REASON */}
      {dismissingFinding && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 text-rose-700 mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-base font-bold text-neutral-900">Dismiss Finding Justification</h3>
            </div>
            <p className="text-xs text-neutral-600 mb-4">
              Dismissing finding for <strong>"{dismissingFinding.quote}"</strong> ({dismissingFinding.ruleId}) requires an audit reason.
            </p>

            <form onSubmit={handleDismissSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Clinical / Regulatory Reason for Dismissal <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={dismissalReason}
                  onChange={(e) => setDismissalReason(e.target.value)}
                  placeholder="e.g. Substantiated by Derma study #VS-2024-03 / Cleared by external legal counsel."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDismissingFinding(null)}
                  className="px-3 py-1.5 text-xs text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!dismissalReason.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700 disabled:opacity-50"
                >
                  Confirm Dismissal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL: CUSTOMIZE SUGGESTION */}
      {editingFinding && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-2">Edit Suggested Rewrite</h3>
            <p className="text-xs text-neutral-600 mb-4">
              Customize the replacement wording for finding: <em>"{editingFinding.quote}"</em>
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Custom Replacement Text
                </label>
                <textarea
                  rows={3}
                  required
                  value={editedSuggestion}
                  onChange={(e) => setEditedSuggestion(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFinding(null)}
                  className="px-3 py-1.5 text-xs text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700"
                >
                  Save Replacement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REQUEST CHANGES MODAL */}
      {requestingChanges && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-neutral-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600" /> Request Revisions from Author
            </h3>
            <p className="text-xs text-neutral-600 mb-4">
              Explain why this draft cannot be approved yet and what revisions are required by the creator.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!changeComment.trim()) return;
                handleTransitionStatus('Changes Requested', changeComment.trim());
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Required Changes / Feedback <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={changeComment}
                  onChange={(e) => setChangeComment(e.target.value)}
                  placeholder="e.g. Please replace unsubstantiated overnight acne cure claim and add mandatory SPF 30+ reminder..."
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestingChanges(false)}
                  className="px-3 py-1.5 text-xs text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusLoading || !changeComment.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 rounded hover:bg-rose-700 disabled:opacity-50"
                >
                  {statusLoading ? 'Submitting...' : 'Submit Changes Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
