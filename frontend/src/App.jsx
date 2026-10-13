import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PaymentModal from './components/PaymentModal';
import LoginModal from './components/LoginModal';
import AccessDenied from './components/AccessDenied';
import CredentialsGuideModal from './components/CredentialsGuideModal';
import MemberPortal from './pages/MemberPortal';
import TrainerPortal from './pages/TrainerPortal';
import AdminPortal from './pages/AdminPortal';
import { api } from './api';
import { Dumbbell, Shield, Sparkles, Database, Check } from 'lucide-react';

export default function App() {
  const [currentPortal, setCurrentPortal] = useState('member');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [activePaymentOrder, setActivePaymentOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Authentication & Guide Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [targetLoginPortal, setTargetLoginPortal] = useState('member');
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

  useEffect(() => {
    loadUserAndState();
  }, []);

  const loadUserAndState = async () => {
    try {
      const res = await api.getCurrentUser();
      if (res && res.authenticated && res.user) {
        setCurrentUser(res.user);
        // Automatically sync initial portal with authenticated role
        if (res.user.role === 'trainer') setCurrentPortal('trainer');
        else if (res.user.role === 'admin') setCurrentPortal('admin');
        else setCurrentPortal('member');

        if (res.user.role === 'member') {
          const sub = await api.getMySubscription(res.user.member_id || 1);
          setActiveSubscription(sub?.active_subscription || null);
        }
      } else {
        // Fallback for initial load: start as Member or prompt login
        setCurrentUser(null);
        setShowLoginModal(true);
      }
    } catch (err) {
      console.error('Failed to load user session:', err);
      setCurrentUser(null);
      setShowLoginModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = async (user, portal) => {
    setCurrentUser(user);
    setCurrentPortal(portal);
    setShowLoginModal(false);

    if (user.role === 'member') {
      const sub = await api.getMySubscription(user.member_id || 1);
      setActiveSubscription(sub?.active_subscription || null);
    } else {
      setActiveSubscription(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setActiveSubscription(null);
    setTargetLoginPortal(currentPortal);
    setShowLoginModal(true);
  };

  const handleSwitchRole = async (role, trainerId = null) => {
    try {
      const res = await api.switchRole(role, trainerId);
      if (res.user) {
        setCurrentUser(res.user);
        if (role === 'trainer') setCurrentPortal('trainer');
        else if (role === 'admin') setCurrentPortal('admin');
        else setCurrentPortal('member');

        if (role === 'member') {
          const sub = await api.getMySubscription(res.user.member_id || 1);
          setActiveSubscription(sub?.active_subscription || null);
        } else {
          setActiveSubscription(null);
        }
      }
    } catch (err) {
      console.error('Failed to switch role:', err);
    }
  };

  const handleOpenLogin = (portal = 'member') => {
    setTargetLoginPortal(portal);
    setShowLoginModal(true);
  };

  const handleSelectAccountFromGuide = (portal, username, password) => {
    setTargetLoginPortal(portal);
    setShowLoginModal(true);
  };

  const handleInitiatePayment = (order) => {
    setActivePaymentOrder(order);
  };

  const handlePaymentSuccess = async (order) => {
    setActivePaymentOrder(null);
    await loadUserAndState();
  };

  // RBAC Permission Validation
  const hasPortalAccess = (portal, user) => {
    if (!user) return false;
    if (portal === 'member') return user.role === 'member';
    if (portal === 'trainer') return user.role === 'trainer';
    if (portal === 'admin') return user.role === 'admin';
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#24483B] flex items-center justify-center animate-bounce mb-4 text-[#B8C8AD]">
          <Dumbbell className="w-6 h-6" />
        </div>
        <div className="text-sm font-black text-[#24483B] tracking-wide">Initializing ApexFit...</div>
        <div className="text-xs text-[#626A62] mt-1">Connecting to normalized MySQL database & verifying RBAC sessions</div>
      </div>
    );
  }

  const isAccessAllowed = hasPortalAccess(currentPortal, currentUser);

  return (
    <div className="min-h-screen bg-[#FAF8F3] text-[#292D29] flex flex-col font-sans">
      
      {/* Top Navbar */}
      <Navbar
        currentPortal={currentPortal}
        setCurrentPortal={setCurrentPortal}
        currentUser={currentUser}
        onSwitchRole={handleSwitchRole}
        activeSubscription={activeSubscription}
        onOpenLogin={handleOpenLogin}
        onLogout={handleLogout}
        onOpenCredentialsGuide={() => setShowCredentialsGuide(true)}
      />

      {/* Main Experience Body with RBAC Security Guard */}
      <main className="flex-1">
        {currentUser && !isAccessAllowed ? (
          /* Access Denied (HTTP 403 Forbidden Screen) */
          <AccessDenied
            currentUser={currentUser}
            targetPortal={currentPortal}
            onSwitchToLogin={(portal) => handleOpenLogin(portal)}
            onReturnToAuthorizedPortal={() => setCurrentPortal(currentUser.role)}
            onOpenCredentialsGuide={() => setShowCredentialsGuide(true)}
          />
        ) : (
          /* Authorized Portal Experience */
          <>
            {currentPortal === 'member' && currentUser?.role === 'member' && (
              <MemberPortal
                currentUser={currentUser}
                activeSubscription={activeSubscription}
                onInitiatePayment={handleInitiatePayment}
                onRefreshData={loadUserAndState}
              />
            )}

            {currentPortal === 'trainer' && currentUser?.role === 'trainer' && (
              <TrainerPortal
                currentUser={currentUser}
                onSwitchRole={handleSwitchRole}
              />
            )}

            {currentPortal === 'admin' && currentUser?.role === 'admin' && (
              <AdminPortal
                currentUser={currentUser}
              />
            )}
          </>
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={currentUser ? () => setShowLoginModal(false) : null}
        targetPortal={targetLoginPortal}
        onLoginSuccess={handleLoginSuccess}
        onOpenCredentialsGuide={() => {
          setShowLoginModal(false);
          setShowCredentialsGuide(true);
        }}
      />

      {/* Credentials and Role Information Guide Modal */}
      <CredentialsGuideModal
        isOpen={showCredentialsGuide}
        onClose={() => setShowCredentialsGuide(false)}
        onSelectAccount={handleSelectAccountFromGuide}
      />

      {/* Global UPI QR Payment Modal */}
      {activePaymentOrder && (
        <PaymentModal
          order={activePaymentOrder}
          onClose={() => setActivePaymentOrder(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#24483B]/10 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-[#626A62]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#24483B] flex items-center justify-center text-[#B8C8AD]">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-[#24483B] text-sm">Apex<span className="text-[#6F8761]">Fit</span></span>
              <p className="text-[11px] text-[#626A62]">Premium Fitness Membership, Class Booking & DBMS Management Platform</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-[#24483B]">
              <Database className="w-3.5 h-3.5 text-[#6F8761]" /> MySQL 8 Relational Database (3NF)
            </span>
            <span>•</span>
            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              RBAC Portal Access Enforced
            </span>
            <span>•</span>
            <span className="text-[#626A62]">18 SQL Reports</span>
            <span>•</span>
            <button
              onClick={() => setShowCredentialsGuide(true)}
              className="text-[#24483B] underline font-bold cursor-pointer hover:text-[#6F8761]"
            >
              Login Passwords Info
            </button>
          </div>

          <div className="text-[11px] text-[#626A62]">
            Academic Capstone Evaluation • Tejaswi Gunda
          </div>
        </div>
      </footer>
    </div>
  );
}
