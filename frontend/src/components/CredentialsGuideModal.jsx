import React from 'react';
import { 
  Key, 
  ShieldCheck, 
  User, 
  Calendar, 
  Shield, 
  Lock, 
  Copy, 
  Check, 
  X, 
  AlertCircle 
} from 'lucide-react';

export default function CredentialsGuideModal({ isOpen, onClose, onSelectAccount }) {
  const [copiedKey, setCopiedKey] = React.useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const portalCredentials = [
    {
      portalKey: 'member',
      portalName: 'Member Portal',
      icon: User,
      bgColor: 'bg-[#FAF8F3]',
      accentColor: 'text-[#24483B]',
      badgeColor: 'bg-[#E6E0F1] text-[#24483B]',
      borderHover: 'hover:border-[#24483B]/40',
      description: 'Discovers workouts, books group classes, purchases gym memberships, and completes dynamic UPI QR payments.',
      allowedRole: 'MEMBER ONLY',
      restrictionNote: '❌ Member accounts CANNOT access Trainer or Admin Portals.',
      accounts: [
        {
          username: 'tejaswi',
          password: 'member123',
          name: 'Tejaswi Gunda',
          tag: 'Primary Member (Annual Platinum Plan)'
        },
        {
          username: 'member_demo',
          password: 'member123',
          name: 'Liam Henderson',
          tag: 'Standard Member (Day Pass)'
        }
      ]
    },
    {
      portalKey: 'trainer',
      portalName: 'Trainer Portal',
      icon: Calendar,
      bgColor: 'bg-[#FAF8F3]',
      accentColor: 'text-[#24483B]',
      badgeColor: 'bg-[#EBC9B8] text-[#24483B]',
      borderHover: 'hover:border-[#6F8761]/40',
      description: 'Manages weekly availability calendar, dynamically generates 1-on-1 PT slots, records session attendance & biometrics.',
      allowedRole: 'TRAINER ONLY',
      restrictionNote: '❌ Trainer accounts CANNOT access Member or Admin Portals.',
      accounts: [
        {
          username: 'trainer_marcus',
          password: 'trainer123',
          name: 'Marcus Fletcher',
          tag: 'Head Strength Coach (Indiranagar Flagship)'
        },
        {
          username: 'trainer_elena',
          password: 'trainer123',
          name: 'Elena Rostova',
          tag: 'Master Yoga Trainer (Koramangala Studio)'
        },
        {
          username: 'trainer_sarah',
          password: 'trainer123',
          name: 'Sarah Connor',
          tag: 'HIIT & Conditioning Specialist'
        }
      ]
    },
    {
      portalKey: 'admin',
      portalName: 'Admin Portal',
      icon: Shield,
      bgColor: 'bg-[#FAF8F3]',
      accentColor: 'text-[#24483B]',
      badgeColor: 'bg-[#B8C8AD] text-[#24483B]',
      borderHover: 'hover:border-[#24483B]/40',
      description: 'Oversees studio operations, equipment allocation & maintenance, overrides studio capacity with audit logs, and runs 18 native SQL DBMS reports.',
      allowedRole: 'ADMIN ONLY',
      restrictionNote: '❌ Admin accounts CANNOT be accessed by members or trainers.',
      accounts: [
        {
          username: 'admin',
          password: 'admin123',
          name: 'Alex Vance (Director)',
          tag: 'Full Administrative Privileges & SQL Engine'
        }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292D29]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-[#24483B]/10 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#24483B] text-white p-6 sm:p-7 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-[#B8C8AD]">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold tracking-tight">Portal Logins & Role Access Guide</h3>
                <span className="bg-[#B8C8AD]/30 text-[#FAF8F3] text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border border-white/20">
                  RBAC Enforced
                </span>
              </div>
              <p className="text-xs text-[#F2EEE5]/80 mt-0.5">
                Strict Role-Based Access Control: Everyone cannot log in to all 3 portals. Each portal permits only its designated role.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Rule Banner */}
        <div className="bg-[#F2EEE5] border-b border-[#24483B]/10 px-6 py-3 flex items-center gap-3 text-xs text-[#292D29]">
          <AlertCircle className="w-4 h-4 text-[#24483B] shrink-0" />
          <div>
            <span className="font-bold text-[#24483B]">Security Policy:</span> Cross-portal authentication is strictly blocked with HTTP 403 Forbidden. A Member cannot log into Trainer or Admin, and a Trainer cannot log into Member or Admin.
          </div>
        </div>

        {/* Portals Grid */}
        <div className="p-6 sm:p-7 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {portalCredentials.map((p) => {
              const Icon = p.icon;
              return (
                <div 
                  key={p.portalKey}
                  className="bg-white rounded-2xl border border-[#24483B]/10 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[#24483B]/10 flex items-center justify-center text-[#24483B]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded-full uppercase ${p.badgeColor}`}>
                        {p.allowedRole}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-[#24483B] text-base mb-1">{p.portalName}</h4>
                    <p className="text-[11px] text-[#626A62] leading-relaxed mb-3">
                      {p.description}
                    </p>

                    <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-2.5 text-[10px] font-semibold text-rose-800 mb-4">
                      {p.restrictionNote}
                    </div>

                    {/* Accounts List */}
                    <div className="space-y-2.5 mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#626A62]">
                        Authorized Accounts:
                      </div>
                      {p.accounts.map((acc) => (
                        <div 
                          key={acc.username}
                          className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl p-2.5 text-xs hover:border-[#24483B]/30 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[#24483B]">{acc.name}</span>
                            <button
                              onClick={() => {
                                onSelectAccount && onSelectAccount(p.portalKey, acc.username, acc.password);
                                onClose();
                              }}
                              className="text-[10px] font-bold text-[#24483B] hover:text-[#6F8761] underline cursor-pointer"
                            >
                              Auto-Fill
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between text-[11px] text-[#626A62] font-mono">
                            <span>User: <strong className="text-[#24483B]">{acc.username}</strong></span>
                            <span>Pass: <strong className="text-[#24483B]">{acc.password}</strong></span>
                            <button
                              onClick={() => copyToClipboard(`${acc.username}:${acc.password}`, acc.username)}
                              className="p-1 hover:bg-[#F2EEE5] rounded-md transition-colors cursor-pointer text-[#626A62]"
                              title="Copy credentials"
                            >
                              {copiedKey === acc.username ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="text-[9px] text-[#626A62] mt-1 font-sans italic">
                            {acc.tag}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Select Button */}
                  <button
                    onClick={() => {
                      if (onSelectAccount) {
                        const firstAcc = p.accounts[0];
                        onSelectAccount(p.portalKey, firstAcc.username, firstAcc.password);
                        onClose();
                      }
                    }}
                    className="w-full py-2 bg-[#24483B] hover:bg-[#1B382D] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer text-center shadow-xs"
                  >
                    Log In to {p.portalName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#FAF8F3] border-t border-[#24483B]/10 px-6 py-4 flex items-center justify-between">
          <div className="text-xs text-[#626A62]">
            Academic Capstone Evaluation • Passwords encrypted with <code className="text-[#24483B] font-mono font-bold">PBKDF2:SHA256</code>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#F2EEE5] hover:bg-[#E6E0F1] text-[#24483B] font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}
