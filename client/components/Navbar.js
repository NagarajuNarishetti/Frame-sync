import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from "next/router";
import API from '../lib/api';

export default function Navbar({ keycloak }) {
  const router = useRouter();
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showInvites, setShowInvites] = useState(false);

  const links = [];

  const loadPendingInvites = async () => {
    if (!keycloak?.authenticated) return;
    try {
      const userResponse = await API.get(`/users?keycloak_id=${keycloak.tokenParsed.sub}`);
      if (userResponse.data.length > 0) {
        const userId = userResponse.data[0].id;
        const invitesResponse = await API.get(`/org-invites/pending/${userId}`);
        setPendingInvites(invitesResponse.data);
        try {
          const event = new CustomEvent('pendingInviteCount', { detail: invitesResponse.data.length });
          window.dispatchEvent(event);
        } catch (_) {}
      }
    } catch (error) {
      console.error('Error loading pending invites:', error);
      try {
        const event = new CustomEvent('pendingInviteCount', { detail: 0 });
        window.dispatchEvent(event);
      } catch (_) {}
    }
  };

  useEffect(() => {
    
    loadPendingInvites();
    const handleRefreshInvites = () => loadPendingInvites();
    window.addEventListener('refreshInvites', handleRefreshInvites);
    return () => window.removeEventListener('refreshInvites', handleRefreshInvites);
  }, [keycloak?.authenticated]);

  const handleAcceptInvite = async (inviteId) => {
    try {
      await API.post(`/org-invites/accept/${inviteId}`);
      alert('✅ Organization invite accepted!');
      loadPendingInvites();
    } catch (error) {
      alert('❌ Failed to accept invite: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      await API.post(`/org-invites/reject/${inviteId}`);
      alert('❌ Organization invite rejected!');
      loadPendingInvites();
    } catch (error) {
      alert('❌ Failed to reject invite: ' + (error.response?.data?.error || error.message));
    }
  };
  

  return (
    <nav className="bg-white/90 backdrop-blur-2xl border-b border-blue-200/50 shadow-[0_2px_15px_rgba(150,194,219,0.3)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div 
            className="flex-shrink-0 cursor-pointer select-none group"
            onClick={() => router.push('/media')}
          >
            <span className="text-2xl font-extrabold text-gray-800 group-hover:text-blue-600 transition-all duration-300">
              FrameSync
            </span>
          </div>



          {/* Right side */}
          <div className="flex items-center space-x-5">

            {/* Auth */}
            {keycloak?.authenticated ? (
              <button
                onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold shadow-lg transition-all duration-200 border border-gray-700"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => keycloak.login()}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg transition-all duration-200 relative overflow-hidden group"
              >
                <span className="relative z-10">Login</span>
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
