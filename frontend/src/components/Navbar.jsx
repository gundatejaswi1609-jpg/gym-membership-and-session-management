import React, { useState } from 'react';
import UserAvatar from './UserAvatar';
import { 
  Dumbbell, 
  User, 
  Shield, 
  Calendar, 
  Award, 
  CreditCard, 
  Sparkles, 
  ChevronDown, 
  LogOut, 
  Check, 
  Layers, 
  RefreshCw,
  Clock,
  Key,
  Lock,
  LogIn
} from 'lucide-react';

export default function Navbar({ 
  currentPortal, 
  setCurrentPortal, 
  currentUser, 
  onSwitchRole, 
  activeSubscription,
  onOpenLogin,
  onLogout,
  onOpenCredentialsGuide
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSelect = async (role, trainerId = null) => {
    setSwitching(true);
    try {
      await onSwitchRole(role, trainerId);
      if (role === 'trainer') setCurrentPortal('trainer');
      else if (role === 'admin') setCurrentPortal('admin');
      else setCurrentPortal('member');
      setShowUserMenu(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const isRoleAuthorized = (portal) => {
    if (!currentUser) return false;
    if (portal === 'member') return currentUser.role === 'member';
    if (portal === 'trainer') return currentUser.role === 'trainer';
    if (portal === 'admin') return currentUser.role === 'admin';
    return false;
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F3]/90 backdrop-blur-md border-b border-[#24483B]/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <div className="flex items-center gap-6 lg:gap-8">
            <button 
              onClick={() => setCurrentPortal(currentUser?.role === 'trainer' ? 'trainer' : (currentUser?.role === 'admin' ? 'admin' : 'member'))}
              className="flex items-center gap-3 text-left focus:outline-none group cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#24483B] flex items-center justify-center text-white shadow-md shadow-[#24483B]/20 group-hover:scale-105 transition-transform">
                <Dumbbell className="w-6 h-6 text-[#B8C8AD]" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight text-[#24483B]">Apex<span className="text-[#6F8761]">Fit</span></span>
                <span className="block text-[10px] font-semibold tracking-widest uppercase text-[#626A62]">Premium Fitness & DBMS</span>
              </div>
            </button>

            {/* Portal Switcher Tabs with RBAC indicator */}
            <nav className="hidden md:flex items-center gap-1 bg-[#F2EEE5] p-1.5 rounded-2xl border border-[#24483B]/5">
              
              {/* Member Portal Tab */}
              <button
                onClick={() => setCurrentPortal('member')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentPortal === 'member'
                    ? 'bg-[#24483B] text-white shadow-sm'
                    : 'text-[#626A62] hover:text-[#24483B] hover:bg-[#FFFFFF]/60'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Member Portal</span>
                {currentUser && currentUser.role !== 'member' && (
                  <Lock className="w-3 h-3 text-[#626A62]/60 ml-0.5" title="Restricted to Members" />
                )}
              </button>

              {/* Trainer Portal Tab */}
              <button
                onClick={() => setCurrentPortal('trainer')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentPortal === 'trainer'
                    ? 'bg-[#24483B] text-white shadow-sm'
                    : 'text-[#626A62] hover:text-[#24483B] hover:bg-[#FFFFFF]/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Trainer Portal</span>
                {currentUser && currentUser.role !== 'trainer' && (
                  <Lock className="w-3 h-3 text-[#626A62]/60 ml-0.5" title="Restricted to Trainers" />
                )}
              </button>

              {/* Admin Portal Tab */}
              <button
                onClick={() => setCurrentPortal('admin')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentPortal === 'admin'
                    ? 'bg-[#24483B] text-white shadow-sm'
                    : 'text-[#626A62] hover:text-[#24483B] hover:bg-[#FFFFFF]/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
                {currentUser && currentUser.role !== 'admin' && (
                  <Lock className="w-3 h-3 text-[#626A62]/60 ml-0.5" title="Restricted to Admins" />
                )}
              </button>
            </nav>
          </div>

          {/* Right Area: Logins Guide, Membership Status & User Authentication */}
          <div className="flex items-center gap-3">
            
            {/* Credentials / Passwords Guide Button */}
            <button
              onClick={onOpenCredentialsGuide}
              className="flex items-center gap-2 bg-[#F2EEE5] hover:bg-[#E6E0F1] border border-[#24483B]/10 px-3.5 py-2 rounded-2xl transition-all text-xs font-extrabold text-[#24483B] cursor-pointer shadow-2xs"
              title="View login information and passwords for all 3 portals"
            >
              <Key className="w-4 h-4 text-[#6F8761]" />
              <span className="hidden sm:inline">Portal Logins & Passwords</span>
            </button>

            {/* Active Membership Badge (when viewing as Member) */}
            {currentUser?.role === 'member' && activeSubscription && (
              <div className="hidden lg:flex items-center gap-2.5 bg-white px-3.5 py-1.5 rounded-full border border-[#B8C8AD]/60 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-[#24483B]">{activeSubscription.plan_name}</span>
                <span className="text-[11px] font-semibold text-[#626A62] bg-[#F2EEE5] px-2 py-0.5 rounded-full">
                  {activeSubscription.days_remaining}d left
                </span>
              </div>
            )}

            {/* User Profile / Auth Button */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 bg-white hover:bg-[#F2EEE5]/70 border border-[#24483B]/10 px-3 py-1.5 rounded-2xl transition-all shadow-xs cursor-pointer text-left"
                >
                  <UserAvatar user={currentUser} size="sm" />
                  <div className="hidden sm:block">
                    <div className="text-xs font-extrabold text-[#24483B] leading-tight">
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#626A62] flex items-center gap-1">
                      Role: <span className="text-[#24483B] capitalize">{currentUser.role}</span>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#626A62]" />
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-84 bg-white rounded-3xl shadow-xl border border-[#24483B]/10 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* User Header with Avatar */}
                    <div className="pb-3 border-b border-[#24483B]/10 mb-3 flex items-center gap-3">
                      <UserAvatar user={currentUser} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-extrabold text-[#24483B] truncate">{currentUser.full_name}</div>
                        <div className="text-[11px] text-[#626A62] font-mono truncate">@{currentUser.username}</div>
                        <div className="text-[10px] text-[#626A62] truncate">{currentUser.email}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            currentUser.role === 'admin' 
                              ? 'bg-[#B8C8AD] text-[#24483B]' 
                              : currentUser.role === 'trainer'
                              ? 'bg-[#EBC9B8] text-[#24483B]'
                              : 'bg-[#E6E0F1] text-[#24483B]'
                          }`}>
                            {currentUser.role.toUpperCase()} PORTAL
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 mb-3">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenLogin(currentPortal);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF8F3] text-xs font-bold text-[#24483B] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <LogIn className="w-4 h-4 text-[#6F8761]" />
                        Switch Account / Login to Another Portal
                      </button>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenCredentialsGuide();
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-[#FAF8F3] text-xs font-bold text-[#24483B] flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Key className="w-4 h-4 text-[#6F8761]" />
                        View All Portal Logins & Passwords
                      </button>
                    </div>

                    {/* Quick Role Switcher for Academic Evaluation */}
                    <div className="pt-2 border-t border-[#24483B]/10 mb-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#626A62] mb-2 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 text-[#6F8761]" /> Quick Role Switcher (Academic Evaluation)
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <button
                          onClick={() => handleRoleSelect('member')}
                          disabled={switching}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            currentUser.role === 'member'
                              ? 'bg-[#24483B] text-white border-[#24483B]'
                              : 'bg-[#FAF8F3] text-[#24483B] border-[#24483B]/10 hover:bg-[#F2EEE5]'
                          }`}
                        >
                          Member
                        </button>
                        <button
                          onClick={() => handleRoleSelect('trainer', 1)}
                          disabled={switching}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            currentUser.role === 'trainer'
                              ? 'bg-[#24483B] text-white border-[#24483B]'
                              : 'bg-[#FAF8F3] text-[#24483B] border-[#24483B]/10 hover:bg-[#F2EEE5]'
                          }`}
                        >
                          Trainer
                        </button>
                        <button
                          onClick={() => handleRoleSelect('admin')}
                          disabled={switching}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                            currentUser.role === 'admin'
                              ? 'bg-[#24483B] text-white border-[#24483B]'
                              : 'bg-[#FAF8F3] text-[#24483B] border-[#24483B]/10 hover:bg-[#F2EEE5]'
                          }`}
                        >
                          Admin
                        </button>
                      </div>
                    </div>

                    {/* Log Out */}
                    <div className="pt-2 border-t border-[#24483B]/10">
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onLogout();
                        }}
                        className="w-full py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Log Out from System
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenLogin(currentPortal)}
                className="flex items-center gap-2 bg-[#24483B] hover:bg-[#1B382D] text-white px-4 py-2 rounded-2xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-[#B8C8AD]" />
                Log In
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
}
