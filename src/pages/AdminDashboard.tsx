import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Profile, PlayerStatus } from '../types';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PlayerStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  async function fetchRequests() {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('*')
      .eq('is_immortal', false)
      .order('created_at', { ascending: false });

    if (filter !== 'ALL') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    setRequests(data || []);
    setLoading(false);
  }

  async function updateStatus(playerId: string, newStatus: PlayerStatus) {
    await supabase
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', playerId);
    fetchRequests();
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-24">
        <div className="glass-card p-10 text-center max-w-md">
          <Shield className="w-16 h-16 text-cta mx-auto mb-4" />
          <h1 className="font-heading text-2xl tracking-wider mb-3">Access Denied</h1>
          <p className="text-text-muted text-sm mb-6">
            You need admin privileges to access this page.
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter(r => r.status === 'REJECTED').length;

  return (
    <div className="min-h-screen px-4 sm:px-6 pt-24 sm:pt-28 pb-12 sm:pb-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
          <h1 className="font-heading text-3xl tracking-wider mb-3">Admin Dashboard</h1>
          <p className="text-text-muted">Manage player registrations and approvals</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="font-heading text-2xl text-text">{pendingCount}</p>
              <p className="text-text-muted text-xs">Pending Requests</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-neon-green/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-neon-green" />
            </div>
            <div>
              <p className="font-heading text-2xl text-text">{approvedCount}</p>
              <p className="text-text-muted text-xs">Approved Players</p>
            </div>
          </div>
          <div className="glass-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-cta/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-cta" />
            </div>
            <div>
              <p className="font-heading text-2xl text-text">{rejectedCount}</p>
              <p className="text-text-muted text-xs">Rejected</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                  ${filter === status
                    ? 'bg-primary text-white shadow-neon-sm'
                    : 'bg-surface text-text-muted hover:text-text hover:bg-surface/80'
                  }`}
              >
                {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <Link
            to="/admin/invites"
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Manage Invites
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-text-muted mt-4">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <Users className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No registration requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((player) => (
              <div key={player.id} className="glass-card p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-text">{player.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                        ${player.status === 'PENDING' ? 'bg-yellow-400/20 text-yellow-400' :
                          player.status === 'APPROVED' ? 'bg-neon-green/20 text-neon-green' :
                          'bg-cta/20 text-cta'}`}>
                        {player.status}
                      </span>
                      {player.is_admin && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary-light text-xs">Admin</span>
                      )}
                      {player.is_arbiter && (
                        <span className="px-2 py-0.5 rounded-full bg-cta/20 text-cta text-xs">Arbiter</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-muted flex-wrap">
                      <span>{player.fca_id}</span>
                      <span className="text-primary/30">|</span>
                      <span>{player.department}</span>
                      <span className="text-primary/30">|</span>
                      <span>{player.faculty}</span>
                      <span className="text-primary/30">|</span>
                      <span>{player.reg_number}</span>
                    </div>
                    {player.lichess_username && (
                      <p className="text-text-muted text-xs mt-1">
                        Lichess: {player.lichess_username}
                        {player.chesscom_username && ` | Chess.com: ${player.chesscom_username}`}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {player.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => updateStatus(player.id, 'APPROVED')}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/20
                                     text-neon-green text-sm font-medium hover:bg-neon-green/20 transition-all duration-200 cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => updateStatus(player.id, 'REJECTED')}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cta/10 border border-cta/20
                                     text-cta text-sm font-medium hover:bg-cta/20 transition-all duration-200 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {player.status === 'APPROVED' && (
                      <button
                        onClick={() => updateStatus(player.id, 'REJECTED')}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cta/10 border border-cta/20
                                   text-cta text-sm font-medium hover:bg-cta/20 transition-all duration-200 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        Revoke
                      </button>
                    )}
                    {player.status === 'REJECTED' && (
                      <button
                        onClick={() => updateStatus(player.id, 'APPROVED')}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neon-green/10 border border-neon-green/20
                                   text-neon-green text-sm font-medium hover:bg-neon-green/20 transition-all duration-200 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
