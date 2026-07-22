import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UserPlus, CheckCircle, ArrowRight, ArrowLeft, Mail, Lock, Loader2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../lib/auth';

const detailsSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  regNumber: z.string().min(3, 'Registration number is required'),
  department: z.string().min(2, 'Department is required'),
  faculty: z.string().min(2, 'Faculty is required'),
  phone: z.string().optional(),
  lichessUsername: z.string().optional(),
  chesscomUsername: z.string().optional(),
});

const accountSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type DetailsData = z.infer<typeof detailsSchema>;
type AccountData = z.infer<typeof accountSchema>;

export default function JoinFCA() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [details, setDetails] = useState<DetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const detailsForm = useForm<DetailsData>({
    resolver: zodResolver(detailsSchema),
  });

  const accountForm = useForm<AccountData>({
    resolver: zodResolver(accountSchema),
  });

  function onDetailsSubmit(data: DetailsData) {
    setDetails(data);
    setStep(2);
  }

  async function onAccountSubmit(data: AccountData) {
    if (!details) return;
    setLoading(true);
    setError('');

    const fcaId = `FCA-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`;

    const { error: signUpError } = await signUp(data.email, data.password, {
      full_name: details.fullName,
      reg_number: details.regNumber,
      department: details.department,
      faculty: details.faculty,
      phone: details.phone || '',
      lichess_username: details.lichessUsername || '',
      chesscom_username: details.chesscomUsername || '',
      fca_id: fcaId,
      status: 'PENDING',
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setStep(3);
    setLoading(false);
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="glass-card p-10 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-neon-green mx-auto mb-6" />
          <h2 className="font-heading text-2xl tracking-wider mb-4">Welcome to FCA!</h2>
          <p className="text-text-muted mb-3 text-sm">
            Your account has been created. Your membership is pending admin verification.
          </p>
          <div className="px-4 py-3 rounded-lg bg-yellow-400/10 border border-yellow-400/20 mb-6">
            <p className="text-yellow-400 text-sm font-medium">Unverified Member</p>
            <p className="text-text-muted text-xs mt-1">
              You can set up your profile while waiting for approval.
            </p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Go to My Profile
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-28 pb-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <UserPlus className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-3xl tracking-wider mb-3">Become an FCA Player</h1>
          <p className="text-text-muted">
            {step === 1
              ? 'Enter your student credentials to get started.'
              : 'Create your account password to finish registration.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                ${step >= s ? 'bg-primary text-white' : 'bg-surface text-text-muted border border-primary/20'}`}>
                {s}
              </div>
              <span className={`text-xs hidden sm:inline ${step === s ? 'text-text' : 'text-text-muted'}`}>
                {s === 1 ? 'Your Details' : 'Create Account'}
              </span>
              {s < 2 && <div className="w-8 h-px bg-primary/20 mx-1" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-cta/10 border border-cta/20 text-cta text-sm mb-6">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="glass-card p-8 space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-text mb-2">Full Name</label>
              <input id="fullName" {...detailsForm.register('fullName')} className="input-field" placeholder="John Doe" />
              {detailsForm.formState.errors.fullName && (
                <p className="text-cta text-xs mt-1">{detailsForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="regNumber" className="block text-sm font-medium text-text mb-2">Registration Number</label>
              <input id="regNumber" {...detailsForm.register('regNumber')} className="input-field" placeholder="e.g., 20221234567" />
              {detailsForm.formState.errors.regNumber && (
                <p className="text-cta text-xs mt-1">{detailsForm.formState.errors.regNumber.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-text mb-2">Department</label>
                <input id="department" {...detailsForm.register('department')} className="input-field" placeholder="e.g., Computer Science" />
                {detailsForm.formState.errors.department && (
                  <p className="text-cta text-xs mt-1">{detailsForm.formState.errors.department.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="faculty" className="block text-sm font-medium text-text mb-2">Faculty</label>
                <input id="faculty" {...detailsForm.register('faculty')} className="input-field" placeholder="e.g., Physical Sciences" />
                {detailsForm.formState.errors.faculty && (
                  <p className="text-cta text-xs mt-1">{detailsForm.formState.errors.faculty.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-text mb-2">Phone (optional)</label>
              <input id="phone" {...detailsForm.register('phone')} className="input-field" placeholder="e.g., 08012345678" />
            </div>

            <div className="border-t border-primary/20 pt-5">
              <p className="text-text-muted text-sm mb-3">Link your chess accounts (optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="lichessUsername" className="block text-sm font-medium text-text mb-2">Lichess Username</label>
                  <input id="lichessUsername" {...detailsForm.register('lichessUsername')} className="input-field" placeholder="your_lichess_handle" />
                </div>
                <div>
                  <label htmlFor="chesscomUsername" className="block text-sm font-medium text-text mb-2">Chess.com Username</label>
                  <input id="chesscomUsername" {...detailsForm.register('chesscomUsername')} className="input-field" placeholder="your_chesscom_handle" />
                </div>
              </div>
            </div>

            <button type="submit" className="w-full btn-primary flex items-center justify-center gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={accountForm.handleSubmit(onAccountSubmit)} className="glass-card p-8 space-y-5">
            <div className="p-3 rounded-lg bg-surface/50 border border-primary/10 mb-2">
              <p className="text-text-muted text-xs">Registering as:</p>
              <p className="text-text font-medium text-sm">{details?.fullName}</p>
              <p className="text-text-muted text-xs">{details?.regNumber} · {details?.department}</p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
              </label>
              <input
                id="email"
                type="email"
                {...accountForm.register('email')}
                className="input-field"
                placeholder="you@example.com"
              />
              {accountForm.formState.errors.email && (
                <p className="text-cta text-xs mt-1">{accountForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</span>
              </label>
              <input
                id="password"
                type="password"
                {...accountForm.register('password')}
                className="input-field"
                placeholder="Min. 6 characters"
              />
              {accountForm.formState.errors.password && (
                <p className="text-cta text-xs mt-1">{accountForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Confirm Password</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                {...accountForm.register('confirmPassword')}
                className="input-field"
                placeholder="Repeat password"
              />
              {accountForm.formState.errors.confirmPassword && (
                <p className="text-cta text-xs mt-1">{accountForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg bg-surface border border-primary/20
                           text-text-muted text-sm hover:text-text transition-all duration-200 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-5 h-4" />
                    Create Account & Join FCA
                  </>
                )}
              </button>
            </div>

            <p className="text-text-muted text-xs text-center mt-2">
              By creating an account you agree to FCA club regulations.
            </p>
          </form>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="text-text-muted text-sm hover:text-primary-light transition-colors duration-200 cursor-pointer">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
