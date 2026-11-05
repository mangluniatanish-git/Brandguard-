import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export default function Settings() {
  const { brand, loading, error: brandError, refreshBrand, saveSettings } = useBrand();

  const [externalAiEnabled, setExternalAiEnabled] = useState(true);
  const [redactionEnabled, setRedactionEnabled] = useState(true);
  const [disclosureText, setDisclosureText] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Sync state with backend settings once loaded
  useEffect(() => {
    if (brand?.settings) {
      setExternalAiEnabled(brand.settings.externalAiEnabled ?? brand.settings.aiEnabled ?? true);
      setRedactionEnabled(brand.settings.redactionEnabled ?? true);
      setDisclosureText(brand.settings.aiDisclosureText ?? brand.settings.disclosureText ?? '');
    }
  }, [brand]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSaveError(null);
      await saveSettings({
        externalAiEnabled,
        aiEnabled: externalAiEnabled,
        redactionEnabled,
        aiDisclosureText: disclosureText,
        disclosureText,
      });
      setSavedSuccess(true);
      const timer = setTimeout(() => setSavedSuccess(false), 3000);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveError(err.message || 'Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !brand) {
    return (
      <div className="py-24 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        <span>Loading system settings from server...</span>
      </div>
    );
  }

  if (brandError && !brand) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-lg max-w-lg mx-auto my-12 text-center" role="alert">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
        <h2 className="text-base font-bold text-rose-900">Failed to Load Settings</h2>
        <p className="text-xs text-rose-700 mt-1">{brandError}</p>
        <button
          type="button"
          onClick={refreshBrand}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-neutral-600 mt-0.5">
          Admin controls for external AI scan engine, PII redaction, and consumer disclosure copy.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md flex items-center gap-2 text-xs font-semibold text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration successfully updated and saved on server.</span>
        </div>
      )}

      {saveError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-md flex items-center gap-2 text-xs text-rose-800" role="alert">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-6">
        {/* Toggle 1: External AI Engine */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <label htmlFor="ai-toggle" className="text-sm font-semibold text-neutral-900">
                External AI Scan Engine (Gemini)
              </label>
            </div>
            <p className="text-xs text-neutral-500 max-w-lg">
              When toggled on, draft submissions are analyzed by Gemini using structured schemas. When turned off, BrandGuard operates strictly in deterministic rules-only mode.
            </p>
            <span className="inline-block text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {externalAiEnabled ? 'Mode: Rules + Gemini AI' : 'Mode: Deterministic Rules-Only'}
            </span>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              id="ai-toggle"
              role="switch"
              aria-checked={externalAiEnabled}
              onClick={() => setExternalAiEnabled(!externalAiEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                externalAiEnabled ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  externalAiEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Toggle 2: Strict Redaction */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-neutral-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <label htmlFor="redaction-toggle" className="text-sm font-semibold text-neutral-900">
                PII Redaction Before External AI Dispatch
              </label>
            </div>
            <p className="text-xs text-neutral-500 max-w-lg">
              When enabled, personally identifiable information (emails, phone numbers, customer IDs) is masked with same-length placeholder characters before transmission to external APIs.
            </p>
            <span className="inline-block text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {redactionEnabled ? 'Status: Strict Redaction Active' : 'Status: Redaction Bypassed'}
            </span>
          </div>

          <div className="flex items-center">
            <button
              type="button"
              id="redaction-toggle"
              role="switch"
              aria-checked={redactionEnabled}
              onClick={() => setRedactionEnabled(!redactionEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                redactionEnabled ? 'bg-emerald-600' : 'bg-neutral-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  redactionEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Input: AI Disclosure Text */}
        <div className="space-y-2">
          <label htmlFor="disclosure-text" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
            Mandatory AI Disclosure Banner Text
          </label>
          <p className="text-xs text-neutral-500">
            This notice is rendered across reviewer workspaces whenever automated AI processing is invoked.
          </p>
          <textarea
            id="disclosure-text"
            required
            rows={3}
            value={disclosureText}
            onChange={(e) => setDisclosureText(e.target.value)}
            className="w-full px-3 py-2 text-xs font-sans border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-neutral-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
