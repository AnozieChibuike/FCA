import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, Eye, EyeOff, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { FUTO_FACULTIES } from '../data/futoData';
import fcaLogo from '../assets/logo.png';

export default function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const invitedRole = searchParams.get('role');

  const [mode, setMode] = useState<'login' | 'signup'>(inviteToken ? 'signup' : 'login');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Base Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile metadata state
  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !regNumber || !department || !faculty || !email) {
      setError('Please fill in all fields to continue.');
      return;
    }
    setError('');
    setSignupStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      navigate('/profile');
    } else {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      const fcaId = `FCA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const metadata: Record<string, unknown> = {
        full_name: fullName,
        reg_number: regNumber,
        department,
        faculty,
        fca_id: fcaId,
      };

      if (invitedRole === 'ADMIN') {
        metadata.is_admin = true;
        metadata.status = 'APPROVED';
      } else if (invitedRole === 'ARBITER') {
        metadata.is_arbiter = true;
        metadata.status = 'APPROVED';
      } else {
        metadata.status = 'PENDING';
      }

      const { error } = await signUp(email, password, metadata);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setLoading(false);
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 sm:pt-28 pb-12">
      <div className="bg-surface border border-chess-border p-5 sm:p-8 rounded-lg shadow-card w-full max-w-md">
        <div className="text-center mb-6">
          <img src={fcaLogo} alt="FCA Logo" className="w-12 h-12 object-contain mx-auto mb-3" />
          <h1 className="font-extrabold text-xl sm:text-2xl text-white">
            {mode === 'login' ? 'Welcome Back' : 'Become an FCA Player'}
          </h1>
          {inviteToken && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/20 border border-primary/30 text-primary-light text-xs font-semibold mt-2">
              Invited as {invitedRole}
            </div>
          )}
          <p className="text-text-muted text-xs mt-2 font-medium">
            {mode === 'login'
              ? 'Sign in to access your FCA Chess account'
              : (signupStep === 1 ? 'Step 1: Player Information' : 'Step 2: Account Security')}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded bg-red-950/60 border border-red-800 text-red-400 text-xs font-semibold mb-5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-white uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary min-h-[46px] flex items-center justify-center gap-2 text-sm sm:text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        ) : (
          /* Signup Form */
          signupStep === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. Magnus Carlsen"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Faculty / School</label>
                <select
                  value={faculty}
                  onChange={(e) => {
                    setFaculty(e.target.value);
                    setDepartment('');
                  }}
                  className="input-field cursor-pointer appearance-none"
                  required
                >
                  <option value="">Select School/Faculty...</option>
                  {FUTO_FACULTIES.map((fac) => (
                    <option key={fac.code} value={fac.code}>{fac.code} - {fac.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-field cursor-pointer appearance-none"
                  required
                  disabled={!faculty}
                >
                  <option value="">{faculty ? 'Select Department...' : 'First Select a Faculty/School...'}</option>
                  {FUTO_FACULTIES.find(f => f.code === faculty)?.departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Registration Number</label>
                <input
                  type="text"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  className="input-field"
                  placeholder="e.g., 20221234567"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full btn-primary min-h-[46px] flex items-center justify-center gap-2 text-sm sm:text-base font-bold mt-4"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] text-text-muted hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setSignupStep(1)}
                  className="btn-secondary min-h-[46px] flex items-center justify-center gap-1.5 px-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary min-h-[46px] flex items-center justify-center gap-2 text-sm sm:text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          )
        )}

        <div className="mt-6 pt-5 border-t border-chess-border text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setSignupStep(1);
              setError('');
            }}
            className="text-text-muted text-xs hover:text-white transition-colors cursor-pointer font-semibold"
          >
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
        </div>

        <div className="mt-3 text-center">
          <Link to="/" className="text-text-muted text-xs hover:text-white transition-colors cursor-pointer">
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
