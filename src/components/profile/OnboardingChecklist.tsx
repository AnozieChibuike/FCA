import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';
import type { Profile } from '../../types';
import { totalGames } from '../../types';
import { initiateLichessOAuth } from '../../lib/lichessOAuth';
import { fetchWhatsappUrl } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { LichessIcon, WhatsappIcon } from '../ui/icons';
import { Card, ProgressBar } from '../ui/misc';

const DISMISS_KEY = 'fca_onboarding_dismissed';

export default function OnboardingChecklist({ profile }: { profile: Profile }) {
  const { refreshProfile } = useAuth();
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === profile.id; } catch { return false; }
  });

  useEffect(() => { fetchWhatsappUrl().then(setWhatsapp); }, []);

  async function joinWhatsapp() {
    if (!whatsapp) return;
    window.open(whatsapp, '_blank', 'noopener');
    await supabase.from('profiles').update({ whatsapp_joined: true }).eq('id', profile.id);
    refreshProfile();
  }

  const steps = [
    {
      done: !!profile.lichess_username,
      label: 'Connect your Lichess account',
      hint: 'So your arena games are rated automatically',
      action: <button onClick={() => initiateLichessOAuth(`/profile/${profile.id}`)} className="btn-primary !min-h-[36px] !px-3 !py-1.5 text-xs"><LichessIcon className="h-3.5 w-3.5" /> Connect</button>,
    },
    {
      done: !!profile.gender && !!profile.avatar_url,
      label: 'Add a photo and your gender',
      hint: 'Shows up on rankings and category leaderboards',
      action: <Link to={`/profile/${profile.id}?edit=1`} className="btn-secondary !min-h-[36px] !px-3 !py-1.5 text-xs">Edit <ChevronRight className="h-3.5 w-3.5" /></Link>,
    },
    ...(whatsapp ? [{
      done: !!profile.whatsapp_joined,
      label: 'Join the FCA WhatsApp group',
      hint: 'Arena links and club news are posted there',
      action: <button onClick={joinWhatsapp} className="btn-secondary !min-h-[36px] !px-3 !py-1.5 text-xs"><WhatsappIcon className="h-3.5 w-3.5 text-[#25D366]" /> Join</button>,
    }] : []),
    {
      done: totalGames(profile) > 0,
      label: 'Play your first Titled Tuesday',
      hint: 'Every Tuesday at 8:30 PM on Lichess',
      action: <Link to="/events" className="btn-secondary !min-h-[36px] !px-3 !py-1.5 text-xs">Events <ChevronRight className="h-3.5 w-3.5" /></Link>,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length || profile.is_immortal) return null;

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-white">Get set up</h2>
          <p className="text-xs text-text-muted">{doneCount} of {steps.length} done{profile.status === 'PENDING' ? ' · an admin will approve your membership soon' : ''}</p>
        </div>
        <button
          onClick={() => { try { localStorage.setItem(DISMISS_KEY, profile.id); } catch { /* private mode */ } setDismissed(true); }}
          className="-mr-2 -mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-text-muted hover:text-white"
          aria-label="Hide checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ProgressBar value={doneCount} max={steps.length} className="mb-3" />
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-3 rounded-xl bg-[#1E1C18] px-3 py-2.5">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.done ? 'border-primary bg-primary text-white' : 'border-chess-border'}`}>
              {s.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-semibold ${s.done ? 'text-text-muted line-through' : 'text-white'}`}>{s.label}</div>
              {!s.done && <div className="text-xs text-text-muted">{s.hint}</div>}
            </div>
            {!s.done && s.action}
          </li>
        ))}
      </ul>
    </Card>
  );
}
