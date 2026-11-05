import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FilePlus,
  Upload,
  Sparkles,
  ArrowRight,
  FileText,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import { submitContent, uploadFile } from '../api';
import { useAuth } from '../context/AuthContext';
import { useBrand } from '../context/BrandContext';

export default function NewContent() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { brand } = useBrand();
  const fileInputRef = useRef(null);

  const rulePacks = brand?.rulePacks?.length > 0
    ? brand.rulePacks
    : [{ id: 'asci_ccpa', name: 'India ASCI/CCPA', description: 'Advertising Standards Council of India Guidelines' }];

  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('Instagram');
  const [rulePack, setRulePack] = useState(rulePacks[0]?.name || 'India ASCI/CCPA');
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedChars, setExtractedChars] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileExtracting, setFileExtracting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const channels = [
    'Instagram',
    'TikTok / YouTube Shorts',
    'Email / CRM',
    'Press Release / PR',
    'Amazon / E-Commerce Listing',
    'Influencer / Talent Script',
  ];

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Real file extraction via POST /api/upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileExtracting(true);
    setUploadError(null);
    setExtractedChars(null);

    try {
      const data = await uploadFile(file);

      if (data.text) {
        setText(data.text);
        setExtractedChars(data.chars || data.text.length);
      }
    } catch (err) {
      console.error('File extraction error:', err);
      setUploadError(err.message || 'Failed to extract text from file');
    } finally {
      setFileExtracting(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setExtractedChars(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReplaceClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    try {
      setLoading(true);
      setSubmitError(null);

      const newContent = await submitContent({
        title: title || 'Untitled Content Draft',
        channel,
        rulePack,
        text,
        file: selectedFile,
        authorName: currentUser?.name || 'Chloe Rivera',
        authorRole: currentUser?.role || 'creator',
      });

      // Navigate to Review Screen
      navigate(`/review/${newContent.id}`);
    } catch (err) {
      console.error('Submission failed', err);
      setSubmitError(err.message || 'Failed to submit content for compliance review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Check New Content</h1>
        <p className="text-sm text-neutral-600 mt-0.5">
          Submit draft copy to run automated compliance checks against brand guidelines and advertising codes.
        </p>
      </div>

      {/* Real Submission Error Alert */}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-sm text-rose-800" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Compliance Scan / Submission Failed</p>
            <p className="text-xs text-rose-700 mt-0.5">{submitError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="content-title" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
            Content Title / Campaign Name <span className="text-rose-600">*</span>
          </label>
          <input
            id="content-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Winter Barrier Restore Serum - Launch Copy"
            className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none"
          />
        </div>

        {/* Channel & Rule Pack Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="channel-select" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              Publishing Channel
            </label>
            <select
              id="channel-select"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {channels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rulepack-select" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
              Regulatory Rule Pack
            </label>
            <select
              id="rulepack-select"
              value={rulePack}
              onChange={(e) => setRulePack(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            >
              {rulePacks.map((rp) => (
                <option key={rp.id} value={rp.name}>
                  {rp.name} ({rp.description?.slice(0, 40)}...)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Extraction Picker */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Import Document (Optional PDF / DOCX / TXT)
            </label>
            {selectedFile && !uploadError && extractedChars && (
              <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Text auto-filled below
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            accept=".pdf,.docx,.txt"
            onChange={handleFileChange}
            className="sr-only"
          />

          {!selectedFile ? (
            /* Upload Dropzone: Shown when no document is attached */
            <label
              htmlFor="file-upload"
              className="border-2 border-dashed border-neutral-300 rounded-lg p-6 text-center hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer flex flex-col items-center justify-center bg-neutral-50/50 group"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-emerald-100 flex items-center justify-center text-neutral-500 group-hover:text-emerald-700 transition-colors mb-2.5">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold text-neutral-800 group-hover:text-emerald-700 transition-colors">
                Click to upload a document
              </span>
              <span className="text-xs text-neutral-500 mt-1">
                Supported formats: PDF, DOCX, or plain TXT (up to 5 MB)
              </span>
            </label>
          ) : (
            /* Attached Document Card: Replaces dropzone once file is selected */
            <div className="border border-neutral-200 bg-white rounded-lg p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                      <span>{formatFileSize(selectedFile.size)}</span>
                      <span>•</span>
                      {fileExtracting ? (
                        <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Extracting text...
                        </span>
                      ) : uploadError ? (
                        <span className="text-rose-600 font-medium">Extraction error</span>
                      ) : (
                        <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {extractedChars ? `${extractedChars} characters extracted` : 'Text extracted'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleReplaceClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                    title="Choose a different document"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors"
                    title="Remove document"
                  >
                    <X className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-start gap-2" role="alert">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to extract text</p>
                    <p className="mt-0.5 text-rose-700">{uploadError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReplaceClick}
                    className="underline hover:no-underline font-medium text-rose-800 shrink-0"
                  >
                    Try another file
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Paste Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="copy-text" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Marketing Copy / Content Text <span className="text-rose-600">*</span>
            </label>
            <span className="text-xs text-neutral-500">{text.length} characters</span>
          </div>
          <textarea
            id="copy-text"
            required
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your marketing copy here to check against brand guidelines, banned vocabulary, time claims, and advertising disclosure codes..."
            className="w-full px-3.5 py-2.5 text-sm font-sans border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
          />
        </div>

        {/* AI & Redaction Notice */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md flex items-start gap-2.5 text-xs text-emerald-900">
          <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Automated Compliance Pipeline:</span> Submitting triggers the deterministic rule engine and external Gemini checks. Personal data (emails, phone numbers) is masked before external AI inspection.
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 shadow-sm focus:ring-2 focus:ring-emerald-600 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Running Compliance Pipeline...
              </>
            ) : (
              <>
                Scan & Submit Content <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
