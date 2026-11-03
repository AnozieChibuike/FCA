import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CalendarPlus, Check, Share2, PartyPopper } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { fetchWhatsappUrl } from '../lib/api';
import { initiateLichessOAuth } from '../lib/lichessOAuth';
import { lastLinkResult } from '../lib/onboarding';
import { downloadEventIcs } from '../lib/ics';
import { inviteUrl, shareLink, siteUrl } from '../lib/share';
import { LichessIcon, WhatsappIcon } from '../components/ui/icons';
import { PageLoader } from '../components/ui/misc';
import { useToast } from '../components/ui/Toast';

function nextTuesdayIso() {
  const d = new Date();
  d.setUTCHours(19, 30, 0, 0);
  d.setUTCDate(d.getUTCDate() + (((2 - d.getUTCDay() + 7) % 7) || (Date.now() > d.getTime() ? 7 : 0)));
  return d.toISOString();
}

export default function Welcome() {
  const { profile, loading, refreshProfile } = useAuth();
  const toast = useToast();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [reminded, setReminded] = useState(false);
  const linked = lastLinkResult();

  useEffect(() => { fetchWhatsappUrl().then(setWhatsapp); }, []);

  if (loading) return <PageLoader />;
  if (!profile) return <Navigate to="/join" replace />;

  async function joinWhatsapp() {
    if (!whatsapp || !profile) return;
    window.open(whatsapp, '_blank', 'noopener');
    await supabase.from('profiles').update({ whatsapp_joined: true }).eq('id', profile.id);
    refreshProfile();
  }

  async function invite() {
    if (!profile) return;
    const outcome = await shareLink({ title: 'Join FCA Rated', text: 'I just joined FCA Rated — rated chess for FUTO. Join me:', url: inviteUrl(profile.fca_id) });
    if (outcome === 'copied') toast('Invite link copied');
  }

  const Step = ({ done, title, text, children }: { done: boolean; title: string; text: string; children?: React.ReactNode }) => (
    <li className="flex items-start gap-3 rounded-2xl border border-chess-border bg-surface p-4">
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${done ? 'border-primary bg-primary text-white' : 'border-chess-border'}`}>
        {done && <Check className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-white">{title}</div>
        <p className="text-sm text-text-muted">{text}</p>
        {!done && children && <div className="mt-3">{children}</div>}
      </div>
    </li>
  );

  return (
    <div className="page max-w-lg py-6">
      <div className="mb-6 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-2xl font-extrabold text-white">Welcome to FCA, {profile.full_name.split(' ')[0]}!</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your FCA ID is <b className="text-white">{profile.fca_id}</b>.
          {profile.status === 'APPROVED' ? ' Your account is approved.' : ' An admin will approve your membership shortly.'}
        </p>
      </div>
      <ol className="space-y-3">
        <Step
          done={!!profile.lichess_username}
          title={profile.lichess_username ? `Lichess @${profile.lichess_username} connected` : 'Connect your Lichess account'}
          text={profile.lichess_username
            ? (linked?.missingGames ? `${linked.missingGames} past games found — they'll be rated once an arbiter approves.` : 'Your arena games will be rated automatically.')
            : 'Titled Tuesday runs on Lichess. Linking proves the account is yours and gets your games rated.'}
        >
          <button onClick={() => initiateLichessOAuth('/welcome')} className="btn-primary w-full"><LichessIcon className="h-4 w-4" /> Connect Lichess</button>
          <a href="https://lichess.org/signup" target="_blank" rel="noreferrer" className="mt-2 block text-center text-xs font-semibold text-primary">No Lichess account? Create one free</a>
        </Step>
        {whatsapp && (
          <Step done={!!profile.whatsapp_joined} title="Join the FCA WhatsApp group" text="Arena links, results and club news.">
            <button onClick={joinWhatsapp} className="btn-secondary w-full"><WhatsappIcon className="h-4 w-4 text-[#25D366]" /> Open WhatsApp group</button>
          </Step>
        )}
        <Step done={reminded} title="Never miss Titled Tuesday" text="Add a weekly reminder to your phone calendar (8:30 PM every Tuesday).">
          <button
            onClick={() => { downloadEventIcs({ id: 'titled-tuesday', title: 'FCA Titled Tuesday', start: nextTuesdayIso(), url: siteUrl('/events'), weekly: true }); setReminded(true); }}
            className="btn-secondary w-full"
          >
            <CalendarPlus className="h-4 w-4" /> Add weekly reminder
          </button>
        </Step>
        <Step done={false} title="Bring a friend" text="Members who join with your link count towards the Recruiter badges.">
          <button onClick={invite} className="btn-secondary w-full"><Share2 className="h-4 w-4" /> Share my invite link</button>
        </Step>
      </ol>
      <Link to={`/profile/${profile.id}`} className="btn-primary mt-6 w-full">Go to my profile</Link>
    </div>
  );
}
