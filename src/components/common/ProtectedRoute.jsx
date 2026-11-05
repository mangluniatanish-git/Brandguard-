import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from './RoleBadge';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, canAccess } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific roles were provided or we check by path
  const isAllowed = allowedRoles
    ? allowedRoles.includes(currentUser.role)
    : canAccess(location.pathname);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="p-3 bg-red-50 text-red-700 rounded-full border border-red-200 mb-4">
          <ShieldAlert className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-neutral-900">Access Restricted</h1>
        <p className="mt-2 text-sm text-neutral-600 max-w-md">
          This section is not accessible to your current role. You are signed in as:
        </p>
        <div className="my-3">
          <RoleBadge role={currentUser.role} className="text-sm px-3 py-1" />
        </div>
        <p className="text-xs text-neutral-500 mb-6">
          Switch to a role with higher permissions (e.g. Reviewer, Manager, or Admin) to view this view.
        </p>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:ring-2 focus:ring-emerald-600"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-600"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            Switch Role
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
