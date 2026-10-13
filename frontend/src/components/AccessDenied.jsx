import React from 'react';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  Key, 
  UserCheck, 
  AlertTriangle, 
  LogIn 
} from 'lucide-react';

export default function AccessDenied({ 
  currentUser, 
  targetPortal, 
  onSwitchToLogin, 
  onReturnToAuthorizedPortal,
  onOpenCredentialsGuide 
}) {
  const portalNames = {
    member: { name: 'Member Portal', role: 'member', color: 'text-[#24483B]' },
    trainer: { name: 'Trainer Portal', role: 'trainer', color: 'text-[#6F8761]' },
    admin: { name: 'Admin Portal', role: 'admin', color: 'text-[#24483B]' },
  };

  const targetInfo = portalNames[targetPortal] || { name: 'Restricted Portal', role: 'authorized user' };
  const currentRole = currentUser?.role || 'unauthorized';

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
      <div className="bg-white rounded-3xl border border-rose-200 shadow-xl overflow-hidden">
        
        {/* Banner */}
        <div className="bg-rose-50 border-b border-rose-200/60 p-6 sm:p-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-600/30 shrink-0">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-rose-600 text-white text-[10px] uppercase font-extrabold tracking-widest px-2.5 py-0.5 rounded-full">
                HTTP 403 Forbidden
              </span>
              <span className="text-xs font-bold text-rose-800">
                Role-Based Access Enforcement
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#292D29] tracking-tight mt-1">
              Access Denied: {targetInfo.name} is Restricted
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-sm text-[#626A62] leading-relaxed">
            You are attempting to access a portal that requires elevated or distinct permissions. 
            Under the security architecture of the ApexFit platform, <strong className="text-[#24483B]">everyone cannot log in to all 3 portals</strong>.
          </p>

          {/* Current Identity vs Target Requirement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62] block mb-1">
                Your Current Authenticated Account
              </span>
              <div className="text-sm font-extrabold text-[#24483B]">
                {currentUser?.full_name || 'Guest User'}
              </div>
              <div className="text-xs font-mono text-[#626A62] mt-0.5">
                Username: <strong>{currentUser?.username}</strong>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-[#E6E0F1] text-[#24483B] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  Role: {currentRole}
                </span>
              </div>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                Required Role for this Portal
              </span>
              <div className="text-sm font-extrabold text-rose-900">
                {targetInfo.name}
              </div>
              <div className="text-xs text-rose-800 mt-0.5">
                Target Entity: <strong>/{targetPortal}</strong>
              </div>
              <div className="mt-2">
                <span className="inline-block bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  Requires: {targetInfo.role.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-[#F2EEE5] rounded-2xl p-4 text-xs text-[#292D29] leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#24483B] block mb-0.5">Why am I seeing this?</strong>
              Members can only view member features (gym access, classes, payments). Trainers can only manage schedules and rosters. Administrators oversee operations and SQL reports. To enter this portal, sign in with an account that has the required role.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => onSwitchToLogin(targetPortal)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#24483B] hover:bg-[#1B382D] text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-[#24483B]/20"
            >
              <LogIn className="w-4 h-4 text-[#B8C8AD]" />
              Log In as a {targetInfo.role.toUpperCase()}
            </button>

            <button
              onClick={onReturnToAuthorizedPortal}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#F2EEE5] hover:bg-[#E6E0F1] text-[#24483B] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#24483B]/10"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to My Portal
            </button>

            <button
              onClick={onOpenCredentialsGuide}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-[#FAF8F3] text-[#626A62] hover:text-[#24483B] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#24483B]/10 ml-auto"
            >
              <Key className="w-4 h-4 text-[#6F8761]" />
              Login Passwords Guide
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
