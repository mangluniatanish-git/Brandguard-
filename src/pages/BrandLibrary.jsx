import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { useAuth } from '../context/AuthContext';

export default function BrandLibrary() {
  const { brand, loading, error: brandError, refreshBrand, saveGuideline, saveFact, saveTerm } = useBrand();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('guidelines'); // 'guidelines' | 'facts' | 'terminology'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionError, setActionError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modal states for Admin add/edit
  const [modalType, setModalType] = useState(null); // 'guideline' | 'fact' | 'term' | null
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [formGuideline, setFormGuideline] = useState({ id: '', title: '', category: 'Claims', text: '' });
  const [formFact, setFormFact] = useState({ id: '', statement: '', source: '', category: 'Clinical Efficacy' });
  const [formTerm, setFormTerm] = useState({ type: 'preferred', term: '', noteOrReason: '' });

  // Handle Loading State
  if (loading && !brand) {
    return (
      <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span>Loading Brand Library guidelines and facts from server...</span>
      </div>
    );
  }

  // Handle Real Error State
  if (brandError && !brand) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg max-w-xl mx-auto my-12 text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-bold text-rose-900">Failed to load Brand Library</h2>
        <p className="text-xs text-rose-700 mt-1">{brandError}</p>
        <button
          type="button"
          onClick={refreshBrand}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
        </button>
      </div>
    );
  }

  const guidelines = brand?.guidelines || [];
  const facts = brand?.approvedFacts || [];
  const terminology = brand?.terminology || { preferred: [], banned: [] };

  // Filtered lists
  const filteredGuidelines = guidelines.filter(
    (g) =>
      g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFacts = facts.filter(
    (f) =>
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.source.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenGuidelineModal = (item = null) => {
    setActionError(null);
    if (item) {
      setEditingItem(item);
      setFormGuideline({ id: item.id, title: item.title, category: item.category || 'General', text: item.text });
    } else {
      setEditingItem(null);
      setFormGuideline({
        id: `GUIDE-0${guidelines.length + 1}`,
        title: '',
        category: 'Claims',
        text: '',
      });
    }
    setModalType('guideline');
  };

  const handleSaveGuideline = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setActionError(null);
      await saveGuideline(formGuideline);
      setModalType(null);
    } catch (err) {
      setActionError(err.message || 'Failed to save guideline clause');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFactModal = (item = null) => {
    setActionError(null);
    if (item) {
      setEditingItem(item);
      setFormFact({ id: item.id, statement: item.statement, source: item.source, category: item.category || 'General' });
    } else {
      setEditingItem(null);
      setFormFact({
        id: `F-0${facts.length + 1}`,
        statement: '',
        source: '',
        category: 'Clinical Efficacy',
      });
    }
    setModalType('fact');
  };

  const handleSaveFact = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setActionError(null);
      await saveFact(formFact);
      setModalType(null);
    } catch (err) {
      setActionError(err.message || 'Failed to save approved fact');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTermModal = (type = 'preferred') => {
    setActionError(null);
    setFormTerm({ type, term: '', noteOrReason: '' });
    setModalType('term');
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setActionError(null);
      const item =
        formTerm.type === 'preferred'
          ? { term: formTerm.term, note: formTerm.noteOrReason }
          : { term: formTerm.term, reason: formTerm.noteOrReason };

      await saveTerm(formTerm.type, item, 'add');
      setModalType(null);
    } catch (err) {
      setActionError(err.message || 'Failed to add terminology');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (type, item) => {
    if (!window.confirm(`Remove term "${item.term}" from ${type} terminology?`)) return;
    try {
      setActionError(null);
      await saveTerm(type, item, 'delete');
    } catch (err) {
      setActionError(err.message || 'Failed to delete term');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Brand Library</h1>
          <p className="text-sm text-neutral-600 mt-0.5">
            Operational source of truth: 10 guideline clauses, 8 approved facts, preferred & banned terms.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {activeTab === 'guidelines' && (
              <button
                type="button"
                onClick={() => handleOpenGuidelineModal()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Guideline
              </button>
            )}
            {activeTab === 'facts' && (
              <button
                type="button"
                onClick={() => handleOpenFactModal()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Approved Fact
              </button>
            )}
            {activeTab === 'terminology' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenTermModal('preferred')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-md hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Preferred Term
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenTermModal('banned')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-300 rounded-md hover:bg-rose-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Banned Term
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Action / Network Error */}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button type="button" onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center border-b border-neutral-200 space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'guidelines'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Guidelines ({guidelines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('facts')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'facts'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            Approved Facts ({facts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('terminology')}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'terminology'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Terminology ({terminology.preferred?.length || 0} pref / {terminology.banned?.length || 0} banned)
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter library..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none bg-white"
          />
        </div>
      </div>

      {/* TAB 1: GUIDELINES */}
      {activeTab === 'guidelines' && (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {filteredGuidelines.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              <BookOpen className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-neutral-700">No guideline clauses found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery ? 'Try clearing your search query' : 'Admin can add guideline clauses using the button above'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3 w-32">Clause ID</th>
                    <th scope="col" className="px-6 py-3 w-48">Title</th>
                    <th scope="col" className="px-6 py-3">Specification / Policy Text</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 text-right w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {filteredGuidelines.map((g) => (
                    <tr key={g.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-xs text-emerald-800">
                        {g.id}
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-900 text-xs">
                        {g.title}
                        {g.category && (
                          <span className="block text-[11px] text-neutral-500 mt-0.5">{g.category}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-700 leading-relaxed font-sans">
                        {g.text}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 text-right text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenGuidelineModal(g)}
                            className="p-1 text-neutral-500 hover:text-emerald-700 rounded transition-colors"
                            title="Edit guideline"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVED FACTS */}
      {activeTab === 'facts' && (
        <div className="bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
          {filteredFacts.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              <FileCheck2 className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-60" />
              <p className="font-medium text-neutral-700">No approved factual claims found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery ? 'Try clearing your search query' : 'Admin can add verified facts using the button above'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left text-sm">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3 w-28">Fact ID</th>
                    <th scope="col" className="px-6 py-3">Substantiated Scientific Statement</th>
                    <th scope="col" className="px-6 py-3 w-64">Verification Source / Clinical Dossier</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 text-right w-24">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {filteredFacts.map((f) => (
                    <tr key={f.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-xs text-emerald-800">
                        {f.id}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-neutral-900 leading-relaxed">
                        {f.statement}
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-500 font-mono">
                        {f.source}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-4 text-right text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenFactModal(f)}
                            className="p-1 text-neutral-500 hover:text-emerald-700 rounded transition-colors"
                            title="Edit approved fact"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TERMINOLOGY */}
      {activeTab === 'terminology' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preferred Terms */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Preferred Vocabulary ({terminology.preferred?.length || 0})
              </h2>
            </div>

            {(!terminology.preferred || terminology.preferred.length === 0) ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No preferred terms defined.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {terminology.preferred.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-neutral-900 font-mono bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200">
                        "{item.term}"
                      </span>
                      {item.note && <p className="text-[11px] text-neutral-500 mt-1">{item.note}</p>}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm('preferred', item)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        title="Remove term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banned Terms */}
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h2 className="text-sm font-semibold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Banned Terms ({terminology.banned?.length || 0})
              </h2>
            </div>

            {(!terminology.banned || terminology.banned.length === 0) ? (
              <p className="text-xs text-neutral-500 py-6 text-center">No banned terms defined.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {terminology.banned.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-rose-900 font-mono bg-rose-50 px-2 py-0.5 rounded border border-rose-200 line-through">
                        "{item.term}"
                      </span>
                      {item.reason && <p className="text-[11px] text-rose-700 mt-1">{item.reason}</p>}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm('banned', item)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                        title="Remove term"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Add/Edit Guideline Modal */}
      {modalType === 'guideline' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {editingItem ? 'Edit Guideline Clause' : 'Add Guideline Clause'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuideline} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Clause ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formGuideline.id}
                    onChange={(e) => setFormGuideline({ ...formGuideline, id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono border rounded bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formGuideline.category}
                    onChange={(e) => setFormGuideline({ ...formGuideline, category: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formGuideline.title}
                  onChange={(e) => setFormGuideline({ ...formGuideline, title: e.target.value })}
                  placeholder="e.g. Clinical Efficacy & Cure Claims"
                  className="w-full px-3 py-1.5 text-xs border rounded"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Clause Policy Text *</label>
                <textarea
                  rows={4}
                  required
                  value={formGuideline.text}
                  onChange={(e) => setFormGuideline({ ...formGuideline, text: e.target.value })}
                  placeholder="Enter detailed compliance rule instructions..."
                  className="w-full px-3 py-2 text-xs border rounded leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Guideline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add/Edit Approved Fact Modal */}
      {modalType === 'fact' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                {editingItem ? 'Edit Approved Fact' : 'Add Approved Fact'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFact} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Fact ID *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingItem}
                    value={formFact.id}
                    onChange={(e) => setFormFact({ ...formFact, id: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs font-mono border rounded bg-neutral-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formFact.category}
                    onChange={(e) => setFormFact({ ...formFact, category: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Substantiated Statement *</label>
                <textarea
                  rows={3}
                  required
                  value={formFact.statement}
                  onChange={(e) => setFormFact({ ...formFact, statement: e.target.value })}
                  placeholder="e.g. Contains 5% Niacinamide shown to strengthen skin moisture barrier."
                  className="w-full px-3 py-2 text-xs border rounded leading-relaxed font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Verification Source / Dossier Ref *</label>
                <input
                  type="text"
                  required
                  value={formFact.source}
                  onChange={(e) => setFormFact({ ...formFact, source: e.target.value })}
                  placeholder="e.g. Clinical Study VS-2025-04, 30 participants"
                  className="w-full px-3 py-1.5 text-xs border rounded font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Fact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add Terminology Modal */}
      {modalType === 'term' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-neutral-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-base font-bold text-neutral-900">
                Add {formTerm.type === 'preferred' ? 'Preferred Term' : 'Banned Term'}
              </h3>
              <button type="button" onClick={() => setModalType(null)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTerm} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Term / Phrase *</label>
                <input
                  type="text"
                  required
                  value={formTerm.term}
                  onChange={(e) => setFormTerm({ ...formTerm, term: e.target.value })}
                  placeholder={formTerm.type === 'preferred' ? 'e.g. botanical formulation' : 'e.g. miracle cure'}
                  className="w-full px-3 py-2 text-xs border rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {formTerm.type === 'preferred' ? 'Usage Note (Optional)' : 'Ban Reason *'}
                </label>
                <input
                  type="text"
                  required={formTerm.type === 'banned'}
                  value={formTerm.noteOrReason}
                  onChange={(e) => setFormTerm({ ...formTerm, noteOrReason: e.target.value })}
                  placeholder={formTerm.type === 'preferred' ? 'Accurately describes plant-based actives' : 'Unsubstantiated medical cure violation'}
                  className="w-full px-3 py-2 text-xs border rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Add Term
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
