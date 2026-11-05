import React from 'react';
import { Menu, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from '../common/RoleBadge';

export default function Header({ onOpenSidebar }) {
  const { currentUser, demoUsers = [], loginAs } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-neutral-200 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 text-neutral-600 rounded-md md:hidden hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-medium text-emerald-800 bg-emerald-50 rounded border border-emerald-200">
            Brand: Verdant Skin
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Rule Engine Online
          </span>
        </div>
      </div>

      {/* Role Quick-Switcher in Header */}
      <div className="flex items-center gap-3">
        {demoUsers.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 p-1 text-xs bg-neutral-100 rounded-lg border border-neutral-200">
            <span className="px-2 text-neutral-500 font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-neutral-400" /> Demo Role:
            </span>
            {demoUsers.map((user) => {
              const isSelected = currentUser?.role === user.role;
              return (
                <button
                  key={user.id || user.role}
                  type="button"
                  onClick={() => loginAs(user.role)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-white text-emerald-800 shadow-sm border border-neutral-200 font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60'
                  }`}
                  aria-pressed={isSelected}
                  title={`Switch to ${user.name} (${user.roleTitle})`}
                >
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </button>
              );
            })}
          </div>
        )}

        {/* User avatar indicator on mobile/compact */}
        {currentUser && (
          <div className="flex items-center gap-2 lg:hidden">
            <RoleBadge role={currentUser.role} />
          </div>
        )}
      </div>
    </header>
  );
}
