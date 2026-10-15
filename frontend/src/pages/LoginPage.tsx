import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, KeyRound, AlertCircle, Loader2, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MASTER_ADMINS } from '../contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user returned from login.');

      // Route user according to role
      // 1. Master admin fast-path
      if (MASTER_ADMINS.includes(cleanEmail)) {
        navigate('/admin');
        return;
      }

      // 2. Check admin_users table
      const { data: adminRecord } = await supabase
        .from('admin_users')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (adminRecord) {
        navigate('/admin');
        return;
      }

      // 3. Check units table
      const { data: unitRecord } = await supabase
        .from('units')
        .select('id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!unitRecord) {
        await supabase.auth.signOut();
        throw new Error('Unauthorized access. Your account is not linked to any registered class unit.');
      }

      // 4. Check if committee members are recorded
      const { data: members } = await supabase
        .from('members')
        .select('id')
        .eq('unit_id', unitRecord.id)
        .limit(1);

      if (!members || members.length === 0) {
        navigate(`/register?complete=true&unit_id=${unitRecord.id}`);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setForgotStatus({
        type: 'success',
        msg: 'Password reset link sent! Please check your email inbox.',
      });
    } catch (err: any) {
      setForgotStatus({
        type: 'error',
        msg: err.message || 'Failed to send password reset link.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 py-16 animate-fade-in">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-maroon text-white p-8 text-center">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <LogIn className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Portal Login</h1>
          <p className="text-xs text-gray-300 mt-1">Sign in with your unit or administrator credentials.</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon transition shadow-sm"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotModalOpen(true);
                    setForgotStatus(null);
                  }}
                  className="text-xs font-semibold text-maroon hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-maroon focus:border-maroon transition shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-maroon hover:bg-maroon-dark text-white rounded-xl text-sm font-black transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-maroon/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-charcoal">
              New unit?{' '}
              <Link to="/register" className="font-bold text-maroon hover:underline">
                Register Class Unit & Committee
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 animate-fade-in-up">
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-maroon" />
                <h3 className="font-black text-sm">Reset Password</h3>
              </div>
              <button
                onClick={() => setForgotModalOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {forgotStatus && (
                <div
                  className={`p-3 rounded-xl text-xs mb-4 flex items-start gap-2 ${
                    forgotStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {forgotStatus.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{forgotStatus.msg}</span>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Enter your account email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-maroon text-white rounded-xl text-xs font-bold hover:bg-maroon-dark transition disabled:opacity-50"
                >
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
