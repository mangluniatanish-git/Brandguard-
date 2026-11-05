import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="p-3 bg-neutral-100 text-neutral-600 rounded-full border border-neutral-200 mb-4">
        <HelpCircle className="w-8 h-8" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold text-neutral-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-neutral-600 max-w-sm">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Dashboard
      </Link>
    </div>
  );
}
