import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  User, 
  Calendar, 
  Shield, 
  Dumbbell, 
  Key, 
  AlertCircle, 
  ArrowRight, 
  Check, 
  X,
  Sparkles,
  UserPlus,
  Activity,
  Heart,
  Scale
} from 'lucide-react';
import { api } from '../api';

export default function LoginModal({ 
  isOpen, 
  onClose, 
  targetPortal = 'member', 
  onLoginSuccess,
  onOpenCredentialsGuide 
}) {
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [selectedPortal, setSelectedPortal] = useState(targetPortal);
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Sign Up / Registration Form State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('member');
  const [regGender, setRegGender] = useState('Male');
  const [regAge, setRegAge] = useState('24');
  const [regWeight, setRegWeight] = useState('70');
  const [regHeight, setRegHeight] = useState('175');
  const [regPhone, setRegPhone] = useState('+91-98765-00000');
  const [regAvatarUrl, setRegAvatarUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    setSelectedPortal(targetPortal);
    setError('');
  }, [targetPortal, isOpen]);

  // Dynamic Real-Time Automatic Calculation of BMI
  const computedBMI = useMemo(() => {
    const w = parseFloat(regWeight) || 0;
    const h = parseFloat(regHeight) || 0;
    if (w > 0 && h > 0) {
      const hMeters = h / 100.0;
      const bmiVal = w / (hMeters * hMeters);
      const rounded = Math.round(bmiVal * 10) / 10;
      let category = 'Normal';
      let color = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      let desc = 'Healthy weight range';

      if (rounded < 18.5) {
        category = 'Underweight';
        color = 'text-sky-700 bg-sky-50 border-sky-200';
        desc = 'Below standard weight';
      } else if (rounded >= 25.0 && rounded < 30.0) {
        category = 'Overweight';
        color = 'text-amber-800 bg-amber-50 border-amber-200';
        desc = 'Slightly above standard';
      } else if (rounded >= 30.0) {
        category = 'Obese';
        color = 'text-rose-700 bg-rose-50 border-rose-200';
        desc = 'Higher health risk';
      }
      return { value: rounded, category, color, desc };
    }
    return { value: 22.9, category: 'Normal', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'Standard range' };
  }, [regWeight, regHeight]);

  if (!isOpen) return null;

  const portalConfigs = {
    member: {
      name: 'Member Portal',
      icon: User,
      role: 'member',
      badgeColor: 'bg-[#E6E0F1] text-[#24483B]',
      badgeText: 'MEMBER ACCESS ONLY',
      desc: 'Workout discovery, class booking, membership purchases, dynamic UPI QR payments',
      quickFill: [
        { label: 'Tejaswi (Active Member)', u: 'tejaswi', p: 'member123' },
        { label: 'Liam (Demo Member)', u: 'member_demo', p: 'member123' }
      ]
    },
    trainer: {
      name: 'Trainer Portal',
      icon: Calendar,
      role: 'trainer',
      badgeColor: 'bg-[#EBC9B8] text-[#24483B]',
      badgeText: 'TRAINER ACCESS ONLY',
      desc: 'Weekly availability calendar, dynamic slot generation, session rosters, attendance & biometrics',
      quickFill: [
        { label: 'Marcus (Head Strength Coach)', u: 'trainer_marcus', p: 'trainer123' },
        { label: 'Elena (Master Yoga Coach)', u: 'trainer_elena', p: 'trainer123' }
      ]
    },
    admin: {
      name: 'Admin Portal',
      icon: Shield,
      role: 'admin',
      badgeColor: 'bg-[#B8C8AD] text-[#24483B]',
      badgeText: 'ADMINISTRATOR ACCESS ONLY',
      desc: 'Gym operations, equipment maintenance, studio capacity overrides, 18 SQL DBMS reports & 3NF database schema',
      quickFill: [
        { label: 'Alex Vance (Director)', u: 'admin', p: 'admin123' }
      ]
    }
  };

  const currentConfig = portalConfigs[selectedPortal] || portalConfigs.member;
  const PortalIcon = currentConfig.icon;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.login(username.trim(), password.trim(), selectedPortal);
      if (res.user) {
        onLoginSuccess(res.user, selectedPortal);
        onClose && onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Full name, username, email, and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        full_name: regFullName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: regRole,
        gender: regGender,
        age: parseInt(regAge) || 25,
        weight_kg: parseFloat(regWeight) || 70.0,
        height_cm: parseFloat(regHeight) || 175.0,
        phone: regPhone.trim(),
        avatar_url: regAvatarUrl.trim() || null
      };

      const res = await api.register(payload);
      if (res.user) {
        onLoginSuccess(res.user, res.user.role);
        onClose && onClose();
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check the provided information.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u, p) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#292D29]/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-[#24483B]/10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="bg-[#24483B] text-white p-5 sm:p-6 relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FAF8F3]/15 flex items-center justify-center text-[#B8C8AD]">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">Apex<span className="text-[#B8C8AD]">Fit</span> Platform</h3>
                <span className="text-[11px] text-[#F2EEE5]/80 font-medium">Authentication & Biometric Profile Management</span>
              </div>
            </div>

            {onClose && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode Switcher Tabs: Sign In vs Sign Up */}
          <div className="flex gap-2 mt-4 bg-white/10 p-1 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-[#24483B] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In (Existing User)
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-[#24483B] shadow-xs'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up (New Account)
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Error Alert */}
          {error && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-3.5 text-xs flex items-start gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {error}
              </div>
            </div>
          )}

          {/* ===================== MODE 1: SIGN IN ===================== */}
          {authMode === 'login' && (
            <div>
              {/* Portal Tabs Selector */}
              <div className="bg-[#F2EEE5] p-1.5 flex gap-1 rounded-2xl border border-[#24483B]/10 mb-4">
                <button
                  type="button"
                  onClick={() => { setSelectedPortal('member'); setError(''); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedPortal === 'member'
                      ? 'bg-[#24483B] text-white shadow-xs'
                      : 'text-[#626A62] hover:text-[#24483B] hover:bg-white/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Member Portal
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedPortal('trainer'); setError(''); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedPortal === 'trainer'
                      ? 'bg-[#24483B] text-white shadow-xs'
                      : 'text-[#626A62] hover:text-[#24483B] hover:bg-white/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Trainer Portal
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedPortal('admin'); setError(''); }}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedPortal === 'admin'
                      ? 'bg-[#24483B] text-white shadow-xs'
                      : 'text-[#626A62] hover:text-[#24483B] hover:bg-white/50'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  Admin Portal
                </button>
              </div>

              {/* Portal Context Banner */}
              <div className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-2xl p-3.5 mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-extrabold text-[#24483B] flex items-center gap-1.5">
                    <PortalIcon className="w-4 h-4 text-[#6F8761]" />
                    {currentConfig.name}
                  </span>
                  <p className="text-[11px] text-[#626A62] mt-0.5">{currentConfig.desc}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ml-2 ${currentConfig.badgeColor}`}>
                  {currentConfig.badgeText}
                </span>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#24483B] mb-1.5">
                    User ID / Username or Email
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter ${currentConfig.role} username or email`}
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] font-medium focus:outline-none focus:border-[#24483B] focus:ring-2 focus:ring-[#24483B]/10 transition-all placeholder:text-[#626A62]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24483B] mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] font-medium focus:outline-none focus:border-[#24483B] focus:ring-2 focus:ring-[#24483B]/10 transition-all placeholder:text-[#626A62]/60"
                  />
                </div>

                {/* Quick Auto-Fill Demo Accounts */}
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#626A62] mb-1.5 flex items-center justify-between">
                    <span>Quick Auto-Fill ({currentConfig.name}):</span>
                    <button
                      type="button"
                      onClick={onOpenCredentialsGuide}
                      className="text-[#24483B] hover:text-[#6F8761] underline text-[10px] cursor-pointer flex items-center gap-1 font-bold"
                    >
                      <Key className="w-3 h-3" /> View All Credentials
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentConfig.quickFill.map((q) => (
                      <button
                        key={q.u}
                        type="button"
                        onClick={() => handleQuickFill(q.u, q.p)}
                        className="px-3 py-1.5 rounded-xl bg-[#F2EEE5] hover:bg-[#E6E0F1] text-[11px] font-bold text-[#24483B] border border-[#24483B]/10 transition-colors cursor-pointer"
                      >
                        ⚡ {q.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-3.5 bg-[#24483B] hover:bg-[#1B382D] text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#24483B]/20 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Verifying Credentials & Role...</span>
                  ) : (
                    <>
                      <span>Sign In to {currentConfig.name}</span>
                      <ArrowRight className="w-4 h-4 text-[#B8C8AD]" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <span className="text-xs text-[#626A62]">Don't have an account yet? </span>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setError(''); }}
                    className="text-xs font-bold text-[#24483B] hover:underline cursor-pointer"
                  >
                    Sign Up here
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ===================== MODE 2: SIGN UP / REGISTRATION ===================== */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              <div className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-2xl p-3.5">
                <span className="text-xs font-extrabold text-[#24483B] flex items-center gap-1.5 mb-1">
                  <UserPlus className="w-4 h-4 text-[#6F8761]" />
                  Create Your Fitness Account
                </span>
                <p className="text-[11px] text-[#626A62] leading-relaxed">
                  Enter your credentials and biometric parameters. Your Body Mass Index (BMI) will be computed automatically and logged to your profile.
                </p>
              </div>

              {/* Account Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('member')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    regRole === 'member'
                      ? 'bg-[#24483B] text-white border-[#24483B]'
                      : 'bg-[#FAF8F3] text-[#24483B] border-[#24483B]/10 hover:bg-[#F2EEE5]'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Gym Member
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('trainer')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    regRole === 'trainer'
                      ? 'bg-[#24483B] text-white border-[#24483B]'
                      : 'bg-[#FAF8F3] text-[#24483B] border-[#24483B]/10 hover:bg-[#F2EEE5]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Certified Trainer
                </button>
              </div>

              {/* Basic Login Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#24483B] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#24483B] mb-1">User ID / Username *</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                    placeholder="e.g. rahul_fit"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#24483B] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value.toLowerCase())}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#24483B] mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full px-3 py-2.5 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>
              </div>

              {/* Biometric & Profile Fields */}
              <div className="pt-2 border-t border-[#24483B]/10">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#24483B] block mb-2">
                  Biometrics & Body Composition
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[#626A62] mb-1">Gender</label>
                    <select
                      value={regGender}
                      onChange={(e) => setRegGender(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Non-Binary">Non-Binary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#626A62] mb-1">Age (Years)</label>
                    <input
                      type="number"
                      min="14"
                      max="90"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#626A62] mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="30"
                      max="250"
                      value={regWeight}
                      onChange={(e) => setRegWeight(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#626A62] mb-1">Height (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="100"
                      max="240"
                      value={regHeight}
                      onChange={(e) => setRegHeight(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                    />
                  </div>
                </div>

                {/* Optional Avatar URL */}
                <div className="mb-3">
                  <label className="block text-[10px] font-bold text-[#626A62] mb-1">
                    Profile Picture URL (Optional - leave blank to use First Letter)
                  </label>
                  <input
                    type="url"
                    value={regAvatarUrl}
                    onChange={(e) => setRegAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... (optional)"
                    className="w-full px-3 py-2 rounded-xl bg-[#FAF8F3] border border-[#24483B]/15 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>

                {/* Automatic BMI Real-Time Calculation Card */}
                <div className="bg-[#F2EEE5]/70 border border-[#24483B]/15 rounded-2xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#24483B] flex items-center justify-center text-[#B8C8AD]">
                      <Scale className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62] block">
                        Automatic BMI Calculation
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-[#24483B]">
                          {computedBMI.value}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${computedBMI.color}`}>
                          {computedBMI.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-[#626A62] hidden sm:block">
                    Formula: <code className="text-[#24483B] font-bold">kg / m²</code>
                    <div>{computedBMI.desc}</div>
                  </div>
                </div>

              </div>

              {/* Submit Sign Up */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#24483B] hover:bg-[#1B382D] text-white rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-[#24483B]/20 disabled:opacity-50"
              >
                {loading ? (
                  <span>Registering Profile & Calculating BMI...</span>
                ) : (
                  <>
                    <span>Complete Sign Up & Enter {regRole === 'trainer' ? 'Trainer Portal' : 'Member Portal'}</span>
                    <ArrowRight className="w-4 h-4 text-[#B8C8AD]" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-[#626A62]">Already registered? </span>
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setError(''); }}
                  className="text-xs font-bold text-[#24483B] hover:underline cursor-pointer"
                >
                  Sign In to an existing account
                </button>
              </div>

            </form>
          )}

        </div>

        {/* Footer Note */}
        <div className="bg-[#FAF8F3] border-t border-[#24483B]/10 p-3.5 text-center text-[11px] text-[#626A62] shrink-0">
          Profiles, credentials, and biometrics are securely persisted to the normalized MySQL database.
        </div>

      </div>
    </div>
  );
}
