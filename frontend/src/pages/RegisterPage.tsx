import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CommitteeOfficer {
  role: string;
  name: string;
  slotNumber: number;
}

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const isCompletingExisting = searchParams.get('complete') === 'true';
  const existingUnitId = searchParams.get('unit_id');

  // Step 1: Unit Details
  const [className, setClassName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2: 9 Mandatory Committee Officers
  const [officers, setOfficers] = useState<CommitteeOfficer[]>([
    { role: 'President', name: '', slotNumber: 1 },
    { role: 'Vice President', name: '', slotNumber: 1 },
    { role: 'Vice President', name: '', slotNumber: 2 },
    { role: 'General Secretary', name: '', slotNumber: 1 },
    { role: 'Joint Secretary', name: '', slotNumber: 1 },
    { role: 'Joint Secretary', name: '', slotNumber: 2 },
    { role: 'Treasurer', name: '', slotNumber: 1 },
    { role: 'Chief Editor', name: '', slotNumber: 1 },
    { role: 'Media', name: '', slotNumber: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (isCompletingExisting && existingUnitId) {
      setStatus({
        type: 'error',
        message: 'Your unit account is registered, but committee members are required to activate access.',
      });
    }
  }, [isCompletingExisting, existingUnitId]);

  const updateOfficerName = (index: number, newName: string) => {
    setOfficers((prev) => {
      const next = [...prev];
      next[index].name = newName;
      return next;
    });
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Validation
    if (!isCompletingExisting) {
      if (!className.trim() || !orgName.trim() || !email.trim() || !password) {
        setStatus({ type: 'error', message: 'Please complete all Step 1 Unit Details fields.' });
        return;
      }
      if (password.length < 6) {
        setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
        return;
      }
    }

    const missingOfficer = officers.find((o) => !o.name.trim());
    if (missingOfficer) {
      setStatus({
        type: 'error',
        message: `All committee member slots are mandatory. Please fill in: ${missingOfficer.role} (${missingOfficer.slotNumber}).`,
      });
      return;
    }

    setLoading(true);

    try {
      let unitId = existingUnitId;

      if (!isCompletingExisting) {
        // Step 1: Create Auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;
        const userId = authData.user?.id;
        if (!userId) throw new Error('Account signup failed. Please try again.');

        // Step 2: Insert into units table
        const { data: unitRecord, error: unitError } = await supabase
          .from('units')
          .insert([
            {
              user_id: userId,
              name: className.trim(),
              class_name: className.trim(),
              address: orgName.trim(), // committee title
              total_score: 0,
              fund_amount: 0,
            },
          ])
          .select('id')
          .single();

        if (unitError) throw unitError;
        unitId = unitRecord.id;
      }

      if (!unitId) throw new Error('Cannot locate unit identifier.');

      // Step 3: Insert all 9 committee members
      const memberRows = officers.map((o) => ({
        unit_id: unitId,
        name: o.name.trim(),
        designation: o.role,
      }));

      const { error: membersError } = await supabase.from('members').insert(memberRows);
      if (membersError) throw membersError;

      setStatus({
        type: 'success',
        message: 'Registration successful! Redirecting to your dashboard...',
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Registration error:', err);
      let msg = err.message || 'Registration failed. Please try again.';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        msg = 'This email is already registered. Please login instead.';
      }
      setStatus({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 w-full animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-gray-900 to-maroon text-white p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Register Your Class Unit</h1>
              <p className="text-xs text-gray-300 mt-1">
                Complete all class information and your 9-member executive committee roster.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleRegister} className="p-8 space-y-8">
          {status && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-start gap-3 ${
                status.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{status.message}</span>
            </div>
          )}

          {/* Step 1: Unit Details (Hidden if completing existing unit) */}
          {!isCompletingExisting && (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-maroon">
                  Step 1 — Class Unit Credentials
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Class Name <span className="text-maroon">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Class 10A"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Committee Name <span className="text-maroon">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Al-Hilal Science Club"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address <span className="text-maroon">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="unit@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Password <span className="text-maroon">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Committee Members */}
          <div className="space-y-4">
            <div className="border-b border-gray-100 pb-2 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-maroon">
                Step 2 — Executive Committee Officers (Mandatory)
              </span>
              <span className="text-[11px] text-gray-400 font-bold">9 Officers</span>
            </div>

            <div className="p-3 bg-yellow-50/80 border border-yellow-200/80 rounded-xl text-xs text-yellow-800">
              ⚠️ All 9 committee positions are <strong>mandatory</strong>. Accounts cannot be activated without full committee records.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {officers.map((officer, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-1.5">
                  <span className="text-xs font-bold text-gray-800 block">
                    {officer.role} {officer.role === 'Vice President' || officer.role === 'Joint Secretary' ? `(${officer.slotNumber})` : ''}
                  </span>
                  <input
                    type="text"
                    required
                    value={officer.name}
                    onChange={(e) => updateOfficerName(index, e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-sm bg-white focus:ring-2 focus:ring-maroon focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-maroon hover:bg-maroon-dark text-white rounded-2xl text-sm font-black transition shadow-xl shadow-maroon/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Completing Registration...</span>
              </>
            ) : (
              <span>Complete Unit Registration</span>
            )}
          </button>

          <p className="text-center text-xs text-charcoal">
            Already registered?{' '}
            <Link to="/login" className="font-bold text-maroon hover:underline">
              Sign in here
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
