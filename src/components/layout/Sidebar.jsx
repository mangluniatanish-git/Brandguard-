import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  ClipboardCheck,
  BarChart2,
  BookOpen,
  Settings,
  Shield,
  X,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import RoleBadge from '../common/RoleBadge';

export default function Sidebar({ isOpen, onClose }) {
  const { currentUser, logout, canAccess } = useAuth();

  const allNavItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['creator', 'reviewer', 'manager', 'admin'],
    },
    {
      to: '/new-content',
      label: 'New Content',
      icon: FilePlus,
      roles: ['creator', 'admin'],
    },
    {
      to: '/my-content',
      label: 'My Content',
      icon: FolderOpen,
      roles: ['creator', 'admin'],
    },
    {
      to: '/review-queue',
      label: 'Review Queue',
      icon: ClipboardCheck,
      roles: ['reviewer', 'admin'],
    },
    {
      to: '/insights',
      label: 'Insights',
      icon: BarChart2,
      roles: ['manager', 'admin'],
    },
    {
      to: '/brand-library',
      label: 'Brand Library',
      icon: BookOpen,
      roles: ['admin'],
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    currentUser ? item.roles.includes(currentUser.role) : false
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        aria-label="Main Navigation"
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-neutral-200 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-emerald-600 text-white font-bold">
              <Shield className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-semibold text-neutral-900 tracking-tight">BrandGuard</span>
              <span className="block text-[11px] font-medium text-neutral-500">Verdant Skin</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 rounded md:hidden focus:ring-2 focus:ring-emerald-600"
            aria-label="Close navigation sidebar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Sidebar Sections">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            Menu
          </div>

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose && onClose()}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-semibold'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-inherit" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Role & User Footer */}
        {currentUser && (
          <div className="p-3 border-t border-neutral-200 bg-neutral-50/50">
            <div className="flex items-start gap-3 p-2 bg-white rounded-md border border-neutral-200 shadow-sm">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs shrink-0">
                {currentUser.avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-900 truncate">{currentUser.name}</p>
                <div className="mt-1">
                  <RoleBadge role={currentUser.role} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 mt-2 pt-2 border-t border-neutral-200 text-xs text-neutral-600">
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-2 py-1.5 hover:text-emerald-700 font-medium rounded hover:bg-neutral-100 transition-colors"
                title="Switch Role"
              >
                <Users className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Switch Role</span>
              </NavLink>

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-2 py-1.5 text-neutral-500 hover:text-red-700 font-medium rounded hover:bg-red-50 transition-colors"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
