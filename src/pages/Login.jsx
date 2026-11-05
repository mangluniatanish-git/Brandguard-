import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, CheckCircle2, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RoleBadge from '../components/common/RoleBadge';

export default function Login() {
  const { currentUser, demoUsers = [], loading: authLoading, error: authError, loginAs } = useAuth();
  const navigate = useNavigate();

  const [submittingRole, setSubmittingRole] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Email / Password form toggle
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingCreds, setSubmittingCreds] = useState(false);

  const handleSelectRole = async (role) => {
    try {
      setSubmittingRole(role);
      setErrorMessage(null);
      await loginAs(role);
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check backend server.');
    } finally {
      setSubmittingRole(null);
    }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setSubmittingCreds(true);
      setErrorMessage(null);
      await loginAs({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setSubmittingCreds(false);
    }
  };

  const roleCapabilities = {
    creator: ['Draft and paste brand content', 'Run automated rule & Gemini scans', 'View and respond to reviewer feedback'],
    reviewer: ['Inspect flagged regulatory claims', 'Approve or Request Changes with comments', 'Filter review queues across channels'],
    manager: ['Track violation velocity by rule and type', 'Inspect most-dismissed rules', 'Monitor turnaround time to approval'],
    admin: ['Edit guideline clauses & approved facts', 'Manage preferred and banned terminology', 'Configure Gemini AI scan & redaction flags'],
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-600 text-white font-bold mb-4 shadow-sm">
          <Shield className="w-7 h-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          Sign In to BrandGuard
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Content compliance, regulatory verification, and human brand governance for{' '}
          <strong className="text-neutral-900 font-semibold">Verdant Skin</strong>.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200 rounded-lg sm:px-10">
          {/* Real Error State */}
          {(errorMessage || authError) && (
            <div
              className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2.5 text-xs text-rose-800"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authentication Error</p>
                <p className="mt-0.5">{errorMessage || authError}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {showCredentialsForm ? 'Sign in with Email' : 'Select a Demo Persona to Enter'}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {showCredentialsForm
                  ? 'Enter your registered credentials to access your organization workspace.'
                  : 'Select one of the 4 verified team roles to test access control and review queues.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCredentialsForm(!showCredentialsForm);
                setErrorMessage(null);
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline ml-4 shrink-0"
            >
              {showCredentialsForm ? '← Back to Demo Roles' : 'Email Login →'}
            </button>
          </div>

          {/* Email / Password Login Form */}
          {showCredentialsForm ? (
            <form onSubmit={handleCredentialLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@verdantskin.com"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 text-sm border border-neutral-300 rounded-md focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCreds}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submittingCreds ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" /> Sign In
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Demo Personas List */
            <>
              {authLoading && demoUsers.length === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <span>Connecting to authentication service...</span>
                </div>
              ) : demoUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500">
                  <p>No demo personas available from the server.</p>
                  <button
                    type="button"
                    onClick={() => handleSelectRole('creator')}
                    className="mt-3 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded hover:bg-emerald-700"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <div className="space-y-4" role="radiogroup" aria-label="Demo role options">
                  {demoUsers.map((user) => {
                    const isSelected = currentUser?.role === user.role;
                    const isCurrentSubmitting = submittingRole === user.role;

                    return (
                      <div
                        key={user.id || user.role}
                        onClick={() => !isCurrentSubmitting && handleSelectRole(user.role)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (!isCurrentSubmitting) handleSelectRole(user.role);
                          }
                        }}
                        tabIndex={0}
                        role="radio"
                        aria-checked={isSelected}
                        className={`group relative p-4 rounded-lg border text-left cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                            : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-neutral-100 text-neutral-800 font-bold border border-neutral-200 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                              {user.avatar || user.role?.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-neutral-900">
                                  {user.name}
                                </span>
                                <RoleBadge role={user.role} />
                              </div>
                              <p className="text-xs text-neutral-500 mt-0.5">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center text-xs font-medium text-emerald-700">
                            {isCurrentSubmitting ? (
                              <span className="inline-flex items-center gap-1 text-neutral-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Authenticating...
                              </span>
                            ) : (
                              <>
                                <span>Enter as {user.roleTitle || user.role}</span>
                                <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                              </>
                            )}
                          </div>
                        </div>

                        {user.description && (
                          <p className="text-xs text-neutral-600 mt-3">{user.description}</p>
                        )}

                        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2.5 border-t border-neutral-100">
                          {roleCapabilities[user.role]?.map((cap, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] text-neutral-500">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
                              <span>{cap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
