import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  Flame, 
  Sparkles, 
  Check, 
  ChevronRight, 
  Star, 
  MapPin, 
  Users, 
  TrendingUp, 
  ArrowRight, 
  ShieldCheck, 
  QrCode, 
  CreditCard, 
  Activity, 
  User, 
  Filter, 
  Search, 
  Heart, 
  AlertCircle,
  FileText,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  CalendarCheck,
  Edit3,
  Save,
  X,
  Scale,
  Ruler,
  HeartPulse
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '../api';
import UserAvatar from '../components/UserAvatar';

export default function MemberPortal({ 
  currentUser, 
  activeSubscription, 
  onInitiatePayment, 
  onRefreshData 
}) {
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(false);
  
  // Data states
  const [classes, setClasses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [myBookings, setMyBookings] = useState({ classes: [], personal_training: [] });
  const [mySubscription, setMySubscription] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [memberProfile, setMemberProfile] = useState(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  // Modals / Details
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [selectedTrainerDetails, setSelectedTrainerDetails] = useState(null);
  const [trainerSlots, setTrainerSlots] = useState([]);
  const [slotDate, setSlotDate] = useState(new Date().toISOString().split('T')[0]);
  const [toastMsg, setToastMsg] = useState('');

  // Profile Edit & Automatic BMI State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    gender: 'Male',
    age: 25,
    weight_kg: 70,
    height_cm: 175,
    avatar_url: '',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const calcBmi = (w, h) => {
    const weight = parseFloat(w);
    const height = parseFloat(h);
    if (!weight || !height || height <= 0) return null;
    const hm = height / 100;
    return Number((weight / (hm * hm)).toFixed(2));
  };

  const getBmiCategory = (bmiVal) => {
    if (!bmiVal) return { label: 'Unknown', color: 'text-gray-500 bg-gray-100 border-gray-200', desc: 'Please record weight and height.' };
    if (bmiVal < 18.5) return { label: 'Underweight', color: 'text-amber-700 bg-amber-50 border-amber-200', desc: 'Focus on caloric surplus and progressive resistance training.' };
    if (bmiVal < 25.0) return { label: 'Normal Weight (Optimal)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', desc: 'Optimal biometric equilibrium! Maintain balanced nutrition and current routine.' };
    if (bmiVal < 30.0) return { label: 'Overweight', color: 'text-orange-700 bg-orange-50 border-orange-200', desc: 'Combine interval conditioning workouts with steady-state cardio.' };
    return { label: 'Obese', color: 'text-red-700 bg-red-50 border-red-200', desc: 'Low-impact cardiovascular conditioning & certified coach guidance recommended.' };
  };

  const openEditProfile = () => {
    setEditForm({
      full_name: memberProfile?.full_name || currentUser?.full_name || '',
      gender: memberProfile?.gender || currentUser?.gender || 'Male',
      age: memberProfile?.age || currentUser?.age || 25,
      weight_kg: memberProfile?.weight_kg || currentUser?.weight_kg || 70,
      height_cm: memberProfile?.height_cm || currentUser?.height_cm || 175,
      avatar_url: memberProfile?.avatar_url || currentUser?.avatar_url || '',
      phone: memberProfile?.phone || ''
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const memberId = memberProfile?.id || currentUser?.member_id || 1;
      const res = await api.updateMemberProfile(memberId, editForm);
      showToast(`✅ Profile saved! Recalculated BMI: ${res.profile.bmi}`);
      setIsEditingProfile(false);
      await loadInitialData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      showToast('Profile update error: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Load initial datasets
  useEffect(() => {
    loadInitialData();
  }, [currentUser]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [cls, sch, pl, tr, bk, sub, prg, pay, prof, progList] = await Promise.all([
        api.getClasses(),
        api.getSchedules({ date: selectedDate }),
        api.getPlans(),
        api.getTrainers(),
        api.getMyBookings(currentUser?.member_id || 1),
        api.getMySubscription(currentUser?.member_id || 1),
        api.getMemberProgress(currentUser?.member_id || 1),
        api.getPaymentHistory(currentUser?.member_id || 1),
        api.getMyProfile(currentUser?.member_id || 1),
        api.getMemberPrograms(currentUser?.member_id || 1),
      ]);
      setClasses(cls);
      setSchedules(sch);
      setPlans(pl);
      setTrainers(tr);
      setMyBookings(bk);
      setMySubscription(sub);
      setProgressData(prg);
      setPaymentHistory(pay);
      setMemberProfile(prof);
      setPrograms(progList);
    } catch (err) {
      console.error(err);
      showToast('Error loading fitness data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle class hold and booking
  const handleBookClass = async (scheduleId) => {
    try {
      const holdRes = await api.createHold(currentUser?.member_id || 1, scheduleId);
      const hold = holdRes.hold;

      if (hold.price === 0.0) {
        // Zero-cost atomic reservation
        const confRes = await api.confirmBooking({
          member_id: currentUser?.member_id || 1,
          schedule_id: scheduleId,
          hold_token: hold.hold_token,
          amount_paid: 0.00
        });
        showToast(`🎉 Session confirmed! Booking Reference: ${confRes.booking_ref}`);
        loadInitialData();
        onRefreshData();
      } else {
        // Paid booking requires payment order
        const orderRes = await api.createPaymentOrder({
          member_id: currentUser?.member_id || 1,
          item_type: 'class',
          item_id: scheduleId,
          amount: hold.price
        });
        onInitiatePayment(orderRes.order);
      }
    } catch (err) {
      showToast('Booking failed: ' + err.message);
    }
  };

  // Handle cancellation
  const handleCancelBooking = async (registrationId) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.cancelBooking(registrationId, currentUser?.member_id || 1);
      showToast('Booking cancelled and seat released.');
      loadInitialData();
      onRefreshData();
    } catch (err) {
      showToast('Cancellation error: ' + err.message);
    }
  };

  // Handle Turnstile check-in simulation
  const handleCheckIn = async (registrationId) => {
    try {
      await api.checkIn({
        registration_id: registrationId,
        member_id: currentUser?.member_id || 1
      });
      showToast('✅ Check-in verified! Turnstile unlocked.');
      loadInitialData();
    } catch (err) {
      showToast('Check-in error: ' + err.message);
    }
  };

  // Handle Trainer slot booking
  const handleSelectTrainer = async (tr) => {
    setSelectedTrainerDetails(tr);
    try {
      const slots = await api.getTrainerSlots(tr.id, slotDate);
      setTrainerSlots(slots);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBookTrainerSlot = async (slot) => {
    try {
      const orderRes = await api.createPaymentOrder({
        member_id: currentUser?.member_id || 1,
        item_type: 'personal_training',
        item_id: selectedTrainerDetails.id,
        amount: selectedTrainerDetails.session_price
      });
      // Save slot details in local storage or pass with payment
      onInitiatePayment({
        ...orderRes.order,
        slot_details: slot,
        trainer_id: selectedTrainerDetails.id
      });
      setSelectedTrainerDetails(null);
    } catch (err) {
      showToast('PT booking failed: ' + err.message);
    }
  };

  // Categories list
  const categories = [
    'All', 'Strength', 'HIIT', 'Yoga', 'Pilates', 'Dance', 'Boxing', 'Functional', 'Recovery'
  ];

  // Filtered schedules
  const filteredSchedules = schedules.filter(s => {
    const matchesCat = selectedCategory === 'All' || s.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = !searchQuery || s.class_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.trainer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvail = !availableOnly || s.seats_remaining > 0;
    return matchesCat && matchesSearch && matchesAvail;
  });

  return (
    <div className="pb-24">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24483B] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-[#B8C8AD]/30 animate-in slide-in-from-bottom-5">
          <Sparkles className="w-5 h-5 text-[#B8C8AD]" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Member Sub-Navigation Tabs */}
      <div className="bg-[#FAF8F3] border-b border-[#24483B]/10 sticky top-20 z-30 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3">
            {[
              { id: 'home', label: 'Home' },
              { id: 'explore', label: 'Explore Workouts' },
              { id: 'memberships', label: 'Gym Memberships' },
              { id: 'classes', label: 'Fitness Classes' },
              { id: 'trainers', label: 'Personal Trainers' },
              { id: 'find-slot', label: 'Find a Slot' },
              { id: 'my-bookings', label: `My Bookings (${myBookings.classes.length + myBookings.personal_training.length})` },
              { id: 'my-membership', label: 'My Membership' },
              { id: 'payments', label: 'Payment History' },
              { id: 'progress', label: 'Fitness Progress' },
              { id: 'programs', label: 'Workout Programmes' },
              { id: 'profile', label: 'Profile & Settings' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#24483B] text-white shadow-xs'
                    : 'text-[#626A62] hover:text-[#24483B] hover:bg-[#F2EEE5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        {/* ========================================================================= */}
        {/* TAB 1: HOME (Cult-style Member Home) */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-200">
            
            {/* Welcoming Greeting & Active Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar user={{ ...currentUser, ...memberProfile }} size="xl" />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6F8761]">Welcome Back</span>
                  <h1 className="text-3xl md:text-4xl font-black text-[#24483B] tracking-tight">
                    Ready to train, {memberProfile?.full_name?.split(' ')[0] || currentUser?.full_name?.split(' ')[0] || 'Tejaswi'}?
                  </h1>
                  <p className="text-sm text-[#626A62] mt-0.5">
                    Discover daily workouts, reserve group studio sessions, or connect with your personal coach.
                  </p>
                </div>
              </div>

              {activeSubscription ? (
                <div className="bg-white border border-[#24483B]/10 rounded-3xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#E6E0F1] flex items-center justify-center text-[#24483B]">
                    <Sparkles className="w-6 h-6 text-[#24483B]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#626A62]">Active Tier</div>
                    <div className="text-sm font-extrabold text-[#24483B]">{activeSubscription.plan_name}</div>
                    <div className="text-[11px] font-semibold text-emerald-600">
                      {activeSubscription.days_remaining} days remaining
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab('my-membership')}
                    className="ml-2 bg-[#F2EEE5] hover:bg-[#EBC9B8]/40 text-[#24483B] text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Manage
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTab('memberships')}
                  className="bg-[#24483B] hover:bg-[#1A362C] text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#B8C8AD]" />
                  Purchase Cult Membership
                </button>
              )}
            </div>

            {/* Hero Section promoting gym access & fitness classes */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#24483B] via-[#2F5849] to-[#1A362C] text-white p-8 md:p-12 shadow-xl">
              <div className="relative z-10 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 bg-[#B8C8AD]/20 text-[#B8C8AD] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#B8C8AD]/30">
                  <Flame className="w-3.5 h-3.5 text-[#EBC9B8]" /> All-Access Pass Active
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4">
                  Transform your routine with elite classes and coaches.
                </h2>
                <p className="text-white/80 text-sm md:text-base leading-relaxed mb-8">
                  From high-octane HIIT Burn and Boxing Conditioning to mindful Vinyasa Yoga and Olympic Strength, book verified seats with real-time capacity in one tap.
                </p>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="bg-[#FAF8F3] hover:bg-white text-[#24483B] font-extrabold px-6 py-3.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Book a Class Today
                  </button>

                  <button
                    onClick={() => setActiveTab('trainers')}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-6 py-3.5 rounded-2xl text-xs transition-all cursor-pointer flex items-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Find a Personal Coach
                  </button>
                </div>
              </div>

              {/* Decorative background glow */}
              <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 bg-radial from-[#B8C8AD] to-transparent pointer-events-none"></div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'Book a Class', desc: 'Reserve studio slots', tab: 'classes', icon: Calendar, color: 'bg-[#E6E0F1]' },
                { title: 'Find a Trainer', desc: '1-on-1 PT coaching', tab: 'trainers', icon: User, color: 'bg-[#EBC9B8]' },
                { title: 'Find a Slot', desc: 'Real-time timetable', tab: 'find-slot', icon: Clock, color: 'bg-[#B8C8AD]' },
                { title: 'My Bookings', desc: 'QR passes & status', tab: 'my-bookings', icon: QrCode, color: 'bg-[#F2EEE5]' },
              ].map((act, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTab(act.tab)}
                  className="card-cult p-5 text-left flex items-start gap-4 cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-2xl ${act.color} flex items-center justify-center text-[#24483B] shrink-0 group-hover:scale-105 transition-transform`}>
                    <act.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[#24483B] group-hover:text-[#6F8761] transition-colors">
                      {act.title}
                    </div>
                    <div className="text-xs text-[#626A62] mt-0.5">{act.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Upcoming Bookings Section */}
            {myBookings.classes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black text-[#24483B]">Upcoming Confirmed Sessions</h3>
                  <button 
                    onClick={() => setActiveTab('my-bookings')} 
                    className="text-xs font-bold text-[#6F8761] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myBookings.classes.slice(0, 3).map((bk) => (
                    <div key={bk.registration_id} className="card-cult p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="pill-badge bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10">
                            {bk.category}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {bk.status}
                          </span>
                        </div>
                        <h4 className="text-base font-extrabold text-[#24483B] mb-1">{bk.class_name}</h4>
                        <div className="text-xs text-[#626A62] space-y-1 mb-4">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#6F8761]" />
                            <span>{bk.session_date} • {bk.start_time.slice(0, 5)} - {bk.end_time.slice(0, 5)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#6F8761]" />
                            <span>Coach: {bk.trainer_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#6F8761]" />
                            <span>{bk.room_name} ({bk.location_name})</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#24483B]/10 flex items-center justify-between">
                        <button
                          onClick={() => handleCheckIn(bk.registration_id)}
                          className="text-xs font-bold text-[#24483B] bg-[#F2EEE5] hover:bg-[#B8C8AD]/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Simulate Check-in
                        </button>
                        <button
                          onClick={() => handleCancelBooking(bk.registration_id)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Classes Carousel / Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-[#24483B]">Recommended Classes</h3>
                  <p className="text-xs text-[#626A62]">Popular high-energy sessions at nearby centres</p>
                </div>
                <button 
                  onClick={() => setActiveTab('classes')} 
                  className="text-xs font-bold text-[#6F8761] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Explore All <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {classes.slice(0, 4).map((c) => (
                  <div key={c.id} className="card-cult overflow-hidden flex flex-col justify-between group">
                    <div className="relative h-44 overflow-hidden">
                      <img 
                        src={c.image_url} 
                        alt={c.class_name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="pill-badge bg-white/90 backdrop-blur-md text-[#24483B] shadow-xs">
                          {c.category}
                        </span>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <span className="pill-badge bg-[#24483B]/90 backdrop-blur-md text-white text-[10px]">
                          {c.duration_minutes} mins
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-extrabold text-[#24483B] mb-1">{c.class_name}</h4>
                        <p className="text-xs text-[#626A62] line-clamp-2 mb-4 leading-relaxed">
                          {c.description}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#24483B]/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#626A62]">Difficulty</span>
                          <div className="text-xs font-bold text-[#24483B]">{c.difficulty_level}</div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCategory(c.category);
                            setActiveTab('classes');
                          }}
                          className="bg-[#24483B] hover:bg-[#1A362C] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1"
                        >
                          Book <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Trainers Showcase */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-[#24483B]">Meet Master Coaches</h3>
                  <p className="text-xs text-[#626A62]">Certified professionals dedicated to your progress</p>
                </div>
                <button 
                  onClick={() => setActiveTab('trainers')} 
                  className="text-xs font-bold text-[#6F8761] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All Coaches <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {trainers.slice(0, 3).map((tr) => (
                  <div key={tr.id} className="card-cult p-5 flex items-start gap-4">
                    <img 
                      src={tr.image_url} 
                      alt={tr.full_name} 
                      className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow-xs"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-[#24483B]">{tr.full_name}</h4>
                        <span className="text-[10px] font-bold text-[#6F8761] bg-[#F2EEE5] px-2 py-0.5 rounded-full">
                          {tr.experience_years} yrs exp
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#626A62] mt-0.5">{tr.specialization}</div>
                      <p className="text-[11px] text-[#626A62] line-clamp-2 mt-2 leading-relaxed">
                        {tr.bio}
                      </p>
                      <button
                        onClick={() => handleSelectTrainer(tr)}
                        className="mt-3 text-xs font-bold text-[#24483B] hover:text-[#6F8761] flex items-center gap-1 cursor-pointer"
                      >
                        Book 1-on-1 Slot (₹{tr.session_price}) <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gym Locations & Facilities */}
            <div className="bg-[#FAF8F3] rounded-3xl p-6 md:p-8 border border-[#24483B]/10">
              <h3 className="text-xl font-black text-[#24483B] mb-1">ApexFit Flagship Centres</h3>
              <p className="text-xs text-[#626A62] mb-6">Access any facility nationwide with your membership</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { name: 'ApexFit Indiranagar Flagship', addr: '100ft Road, HAL 2nd Stage', city: 'Bengaluru', hours: '06:00 - 22:30', cap: '250 capacity' },
                  { name: 'ApexFit Koramangala Studio', addr: '80ft Road, 4th Block', city: 'Bengaluru', hours: '06:00 - 22:00', cap: '180 capacity' },
                  { name: 'ApexFit HSR Club', addr: '27th Main, Sector 1', city: 'Bengaluru', hours: '06:00 - 22:00', cap: '200 capacity' },
                ].map((loc, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-[#24483B]/10 shadow-xs">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="w-4 h-4 text-[#6F8761]" />
                      <span className="text-sm font-bold text-[#24483B]">{loc.name}</span>
                    </div>
                    <p className="text-xs text-[#626A62] mb-2">{loc.addr}, {loc.city}</p>
                    <div className="flex items-center justify-between text-[11px] text-[#626A62] pt-2 border-t border-[#24483B]/5">
                      <span>{loc.hours}</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{loc.cap}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: EXPLORE WORKOUTS */}
        {/* ========================================================================= */}
        {activeTab === 'explore' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <h2 className="text-3xl font-black text-[#24483B]">Explore Workout Disciplines</h2>
              <p className="text-sm text-[#626A62] mt-1">
                Choose your focus: build raw strength, torch calories, or master mobility.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((c) => (
                <div key={c.id} className="card-cult overflow-hidden flex flex-col justify-between">
                  <div className="h-52 relative overflow-hidden">
                    <img src={c.image_url} alt={c.class_name} className="w-full h-full object-cover" />
                    <span className="absolute top-4 left-4 pill-badge bg-white/95 text-[#24483B] shadow-sm">
                      {c.category}
                    </span>
                    <span className="absolute bottom-4 right-4 pill-badge bg-[#24483B]/90 text-white">
                      {c.difficulty_level}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-black text-[#24483B] mb-2">{c.class_name}</h3>
                      <p className="text-xs text-[#626A62] leading-relaxed mb-4">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#24483B]/10 flex items-center justify-between">
                      <div className="text-xs text-[#626A62]">
                        Duration: <span className="font-bold text-[#24483B]">{c.duration_minutes} min</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(c.category);
                          setActiveTab('classes');
                        }}
                        className="bg-[#24483B] hover:bg-[#1A362C] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        View Schedules <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GYM MEMBERSHIPS */}
        {/* ========================================================================= */}
        {activeTab === 'memberships' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div className="text-center max-w-2xl mx-auto">
              <span className="pill-badge bg-[#E6E0F1] text-[#24483B] mb-2">Flexible Fitness Memberships</span>
              <h2 className="text-3xl md:text-4xl font-black text-[#24483B]">Choose Your Fitness Tier</h2>
              <p className="text-sm text-[#626A62] mt-2">
                Transparent pricing in INR. All memberships include unlimited gym floor access, locker access, and verified booking privileges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((p) => {
                const isCurrent = activeSubscription?.plan_id === p.id;
                const isPopular = p.plan_name.includes('Quarterly') || p.plan_name.includes('Annual');

                return (
                  <div 
                    key={p.id} 
                    className={`card-cult p-6 flex flex-col justify-between relative ${
                      isPopular ? 'border-2 border-[#24483B] shadow-lg' : ''
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#24483B] text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-[#6F8761]">
                          {p.plan_tier} Tier
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            Current Plan
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-black text-[#24483B] mb-1">{p.plan_name}</h3>
                      <p className="text-xs text-[#626A62] mb-5">{p.description}</p>

                      <div className="mb-6 pb-6 border-b border-[#24483B]/10">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-[#24483B]">
                            ₹{p.price.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-[#626A62]">/ {p.duration_days} days</span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-8">
                        <div className="text-xs font-bold text-[#24483B] uppercase tracking-wider">Included Benefits:</div>
                        {p.benefits_list?.map((b, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-[#626A62]">
                            <Check className="w-4 h-4 text-[#6F8761] shrink-0 mt-0.5" />
                            <span>{b}</span>
                          </div>
                        ))}
                        <div className="flex items-start gap-2.5 text-xs text-[#24483B] font-semibold">
                          <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span>{p.trainer_benefits}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          const res = await api.purchaseMembership(currentUser?.member_id || 1, p.id);
                          onInitiatePayment(res.order);
                        } catch (err) {
                          showToast('Purchase initiation error: ' + err.message);
                        }
                      }}
                      className={`w-full py-3.5 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isPopular
                          ? 'bg-[#24483B] hover:bg-[#1A362C] text-white shadow-md'
                          : 'bg-[#F2EEE5] hover:bg-[#24483B] hover:text-white text-[#24483B]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      {isCurrent ? 'Renew Membership' : 'Proceed to Checkout (UPI QR)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FITNESS CLASSES (Discovery, Filtering, & Booking) */}
        {/* ========================================================================= */}
        {activeTab === 'classes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-[#24483B]">Fitness Classes Timetable</h2>
                <p className="text-sm text-[#626A62]">Live scheduled group sessions with real-time seat tracking</p>
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-2 bg-[#F2EEE5] p-1 rounded-2xl border border-[#24483B]/5 self-start">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'list' ? 'bg-[#24483B] text-white shadow-xs' : 'text-[#626A62]'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'calendar' ? 'bg-[#24483B] text-white shadow-xs' : 'text-[#626A62]'
                  }`}
                >
                  Calendar View
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-3xl p-4 border border-[#24483B]/10 shadow-xs space-y-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#24483B] text-white shadow-xs'
                        : 'bg-[#FAF8F3] hover:bg-[#F2EEE5] text-[#626A62]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Date & Search Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#24483B]/5">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      api.getSchedules({ date: e.target.value }).then(setSchedules);
                    }}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#24483B]"
                  />
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#626A62]" />
                  <input
                    type="text"
                    placeholder="Search workout or coach..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#24483B]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#24483B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                      className="rounded accent-[#24483B]"
                    />
                    Available Slots Only
                  </label>
                </div>
              </div>
            </div>

            {/* Schedules List */}
            {filteredSchedules.length === 0 ? (
              <div className="card-cult p-12 text-center">
                <Calendar className="w-12 h-12 text-[#6F8761] mx-auto mb-3 opacity-60" />
                <h3 className="text-base font-bold text-[#24483B]">No classes found matching filters</h3>
                <p className="text-xs text-[#626A62] mt-1">Try selecting another date or category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSchedules.map((sch) => {
                  const isFull = sch.seats_remaining <= 0;

                  return (
                    <div key={sch.id} className="card-cult p-5 flex flex-col justify-between">
                      <div>
                        {/* Top Category & Seats Left */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="pill-badge bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10">
                            {sch.category}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isFull 
                              ? 'bg-red-50 text-red-600 border border-red-200' 
                              : sch.seats_remaining <= 3 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isFull ? 'Sold Out' : `${sch.seats_remaining} seats left`}
                          </span>
                        </div>

                        <h3 className="text-lg font-black text-[#24483B] mb-2">{sch.class_name}</h3>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs text-[#626A62] mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#6F8761]" />
                            <span className="font-bold text-[#24483B]">
                              {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                            </span>
                            <span>({sch.duration_minutes}m)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#6F8761]" />
                            <span>Coach: <strong className="text-[#24483B]">{sch.trainer_name}</strong></span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#6F8761]" />
                            <span>{sch.room_name} • {sch.location_name}</span>
                          </div>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="space-y-1 mb-5">
                          <div className="flex justify-between text-[10px] font-bold text-[#626A62]">
                            <span>Capacity</span>
                            <span>{sch.booked_capacity} / {sch.max_capacity} booked</span>
                          </div>
                          <div className="w-full bg-[#F2EEE5] h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#24483B] h-full rounded-full transition-all"
                              style={{ width: `${sch.occupancy_rate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleBookClass(sch.id)}
                        disabled={isFull}
                        className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
                          isFull
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#24483B] hover:bg-[#1A362C] text-white shadow-xs'
                        }`}
                      >
                        {isFull ? 'Class Fully Booked' : 'Reserve Seat (Atomic Hold)'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PERSONAL TRAINERS */}
        {/* ========================================================================= */}
        {activeTab === 'trainers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-3xl font-black text-[#24483B]">Personal Coaching</h2>
              <p className="text-sm text-[#626A62]">1-on-1 personalized biomechanics, hypertrophy, and conditioning</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trainers.map((tr) => (
                <div key={tr.id} className="card-cult p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start gap-4 mb-4">
                      <img 
                        src={tr.image_url} 
                        alt={tr.full_name} 
                        className="w-20 h-20 rounded-2xl object-cover shadow-sm shrink-0"
                      />
                      <div>
                        <h3 className="text-lg font-black text-[#24483B]">{tr.full_name}</h3>
                        <div className="text-xs font-semibold text-[#6F8761]">{tr.specialization}</div>
                        <div className="text-[11px] text-[#626A62] mt-1">{tr.certification}</div>
                      </div>
                    </div>

                    <p className="text-xs text-[#626A62] leading-relaxed mb-4">
                      {tr.bio}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {tr.specializations?.map((sp, idx) => (
                        <span key={idx} className="text-[10px] font-bold bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10 px-2 py-0.5 rounded-md">
                          {sp.category} • {sp.proficiency_level}
                        </span>
                      ))}
                    </div>

                    <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5 flex justify-between items-center mb-5 text-xs">
                      <span className="text-[#626A62]">1-Hour Session:</span>
                      <span className="font-black text-base text-[#24483B]">₹{tr.session_price}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTrainer(tr)}
                    className="w-full bg-[#24483B] hover:bg-[#1A362C] text-white py-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Calendar className="w-4 h-4 text-[#B8C8AD]" />
                    View Live Available Slots
                  </button>
                </div>
              ))}
            </div>

            {/* Trainer Slot Picker Modal */}
            {selectedTrainerDetails && (
              <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-[#24483B]/10">
                  <div className="flex items-center justify-between pb-4 border-b border-[#24483B]/10 mb-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedTrainerDetails.image_url} 
                        alt={selectedTrainerDetails.full_name}
                        className="w-12 h-12 rounded-xl object-cover" 
                      />
                      <div>
                        <h3 className="font-extrabold text-base text-[#24483B]">{selectedTrainerDetails.full_name}</h3>
                        <p className="text-xs text-[#626A62]">Book 1-on-1 PT Session (₹{selectedTrainerDetails.session_price})</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedTrainerDetails(null)} className="cursor-pointer text-[#626A62]">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Date Selector */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-[#24483B] mb-1 block">Choose Date</label>
                    <input 
                      type="date"
                      value={slotDate}
                      onChange={async (e) => {
                        setSlotDate(e.target.value);
                        const sl = await api.getTrainerSlots(selectedTrainerDetails.id, e.target.value);
                        setTrainerSlots(sl);
                      }}
                      className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#24483B]"
                    />
                  </div>

                  {/* Slots Grid */}
                  <div className="space-y-2 mb-6">
                    <div className="text-xs font-bold text-[#24483B]">Available 1-Hour Time Slots:</div>
                    {trainerSlots.length === 0 ? (
                      <p className="text-xs text-[#626A62] py-4 text-center bg-[#FAF8F3] rounded-xl">
                        No open slots found for this date. (Trainer may be teaching classes or on leave).
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {trainerSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => handleBookTrainerSlot(slot)}
                            className="p-2.5 rounded-xl border border-[#24483B]/15 bg-[#FAF8F3] hover:bg-[#24483B] hover:text-white text-xs font-bold text-[#24483B] transition-all cursor-pointer text-center"
                          >
                            {slot.formatted_label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: FIND A SLOT */}
        {/* ========================================================================= */}
        {activeTab === 'find-slot' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[#24483B]">Find an Open Slot</h2>
              <p className="text-sm text-[#626A62]">Rapid schedule locator across studio classes and personal trainers</p>
            </div>

            <div className="card-cult p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#24483B] block mb-1">Target Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      api.getSchedules({ date: e.target.value }).then(setSchedules);
                    }}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#24483B]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#24483B] block mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#24483B]"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-[#24483B]">Available Studio Sessions on {selectedDate}:</h3>
                <div className="space-y-2">
                  {filteredSchedules.map((sch) => (
                    <div key={sch.id} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#24483B]/10 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-extrabold text-[#24483B]">{sch.class_name}</div>
                        <div className="text-xs text-[#626A62]">
                          {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)} • Coach: {sch.trainer_name} • {sch.seats_remaining} seats remaining
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookClass(sch.id)}
                        disabled={sch.seats_remaining <= 0}
                        className="bg-[#24483B] hover:bg-[#1A362C] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                      >
                        Book Slot
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: MY BOOKINGS */}
        {/* ========================================================================= */}
        {activeTab === 'my-bookings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">My Booked Sessions</h2>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#24483B]">Group Fitness Classes</h3>
              {myBookings.classes.length === 0 ? (
                <div className="card-cult p-8 text-center text-xs text-[#626A62]">
                  No group classes booked yet. Explore the timetable to reserve your seat!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myBookings.classes.map((bk) => (
                    <div key={bk.registration_id} className="card-cult p-5 flex items-start justify-between">
                      <div>
                        <span className="pill-badge bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10 mb-2">
                          {bk.category}
                        </span>
                        <h4 className="text-base font-extrabold text-[#24483B]">{bk.class_name}</h4>
                        <div className="text-xs text-[#626A62] mt-1 space-y-0.5">
                          <div>📅 {bk.session_date} ({bk.start_time.slice(0, 5)} - {bk.end_time.slice(0, 5)})</div>
                          <div>👤 Coach: {bk.trainer_name}</div>
                          <div>📍 {bk.room_name}</div>
                          <div>Status: <strong className="text-emerald-700">{bk.status}</strong></div>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleCheckIn(bk.registration_id)}
                            className="bg-[#24483B] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            Turnstile Scan
                          </button>
                          <button
                            onClick={() => handleCancelBooking(bk.registration_id)}
                            className="text-xs font-bold text-red-600 hover:underline px-2 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Dynamic Pass QR representation */}
                      <div className="bg-[#FAF8F3] p-2 rounded-xl border border-[#24483B]/10 text-center">
                        <span className="text-[9px] font-bold text-[#626A62] block mb-1">Entry QR</span>
                        <div className="w-16 h-16 bg-white border border-[#24483B]/10 rounded-lg flex items-center justify-center p-1">
                          <QrCode className="w-12 h-12 text-[#24483B]" />
                        </div>
                        <span className="text-[8px] font-mono text-[#626A62] block mt-1">BK-{bk.registration_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Personal Training appointments */}
              <h3 className="text-lg font-bold text-[#24483B] pt-4">Personal Training Appointments</h3>
              {myBookings.personal_training.length === 0 ? (
                <div className="card-cult p-8 text-center text-xs text-[#626A62]">
                  No 1-on-1 personal training sessions booked yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myBookings.personal_training.map((pt) => (
                    <div key={pt.id} className="card-cult p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-[#24483B]">1-on-1 Session with {pt.trainer_name}</span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{pt.status}</span>
                      </div>
                      <div className="text-xs text-[#626A62] space-y-0.5 mb-3">
                        <div>📅 {pt.booking_date} ({pt.start_time.slice(0, 5)} - {pt.end_time.slice(0, 5)})</div>
                        <div>Fee: ₹{pt.price} (Paid via UPI)</div>
                        {pt.notes && <div className="italic">Note: "{pt.notes}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: MY MEMBERSHIP */}
        {/* ========================================================================= */}
        {activeTab === 'my-membership' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
            <h2 className="text-3xl font-black text-[#24483B]">My Membership Details</h2>

            {mySubscription?.active_subscription ? (
              <div className="card-cult p-8 space-y-6">
                <div className="flex items-center justify-between pb-6 border-b border-[#24483B]/10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#6F8761]">Tier Active</span>
                    <h3 className="text-2xl font-black text-[#24483B]">{mySubscription.active_subscription.plan_name}</h3>
                    <p className="text-xs text-[#626A62] mt-0.5">{mySubscription.active_subscription.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-[#24483B]">{mySubscription.active_subscription.days_remaining}</span>
                    <span className="block text-[11px] font-bold text-[#626A62]">Days Remaining</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5">
                    <span className="text-[#626A62] block mb-0.5">Start Date</span>
                    <strong className="text-[#24483B]">{mySubscription.active_subscription.start_date}</strong>
                  </div>
                  <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5">
                    <span className="text-[#626A62] block mb-0.5">Expiry Date</span>
                    <strong className="text-[#24483B]">{mySubscription.active_subscription.end_date}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#24483B] mb-3">Privileges & Benefits:</h4>
                  <div className="space-y-2">
                    {mySubscription.active_subscription.benefits_list?.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-[#626A62]">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('memberships')}
                  className="w-full bg-[#24483B] hover:bg-[#1A362C] text-white py-3.5 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4 text-[#B8C8AD]" />
                  Renew / Upgrade Membership
                </button>
              </div>
            ) : (
              <div className="card-cult p-8 text-center">
                <p className="text-sm text-[#626A62] mb-4">You do not currently have an active membership.</p>
                <button
                  onClick={() => setActiveTab('memberships')}
                  className="bg-[#24483B] text-white px-6 py-3 rounded-xl font-bold text-xs"
                >
                  Explore Membership Plans
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: PAYMENT HISTORY */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Payment History Ledger</h2>
            <p className="text-sm text-[#626A62]">Audit log of completed transactions and subscriptions</p>

            <div className="card-cult overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10">
                    <tr>
                      <th className="p-4">Transaction Ref</th>
                      <th className="p-4">Order Ref</th>
                      <th className="p-4">Item Type</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                    {paymentHistory.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F3]/50">
                        <td className="p-4 font-mono font-bold text-[#24483B]">{p.transaction_ref}</td>
                        <td className="p-4 font-mono">{p.order_ref}</td>
                        <td className="p-4 capitalize">{p.item_type || 'Membership'}</td>
                        <td className="p-4">{p.payment_method}</td>
                        <td className="p-4 font-bold text-[#24483B]">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4">{p.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: FITNESS PROGRESS */}
        {/* ========================================================================= */}
        {activeTab === 'progress' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Fitness Progression & Biometrics</h2>

            {/* Metric KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Current Weight</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">74.5 kg</div>
                <span className="text-[11px] text-emerald-600 font-bold">-2.1 kg this month</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Body Mass Index (BMI)</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">23.51</div>
                <span className="text-[11px] text-emerald-600 font-bold">Normal Range</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Body Fat %</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">15.2%</div>
                <span className="text-[11px] text-emerald-600 font-bold">Athletic Tier</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Workouts Attended</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">
                  {progressData?.total_workouts_completed || 12}
                </div>
                <span className="text-[11px] text-[#6F8761] font-bold">Top 15% Consistency</span>
              </div>
            </div>

            {/* Attendance breakdown by discipline */}
            <div className="card-cult p-6">
              <h3 className="text-base font-extrabold text-[#24483B] mb-4">Discipline Attendance Split</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {progressData?.category_breakdown?.map((cat, idx) => (
                  <div key={idx} className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/5 text-center">
                    <span className="text-xs font-bold text-[#626A62] block mb-1">{cat.category}</span>
                    <span className="text-2xl font-black text-[#24483B]">{cat.classes_attended}</span>
                    <span className="text-[10px] text-[#626A62] block mt-0.5">sessions</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: WORKOUT PROGRAMMES */}
        {/* ========================================================================= */}
        {activeTab === 'programs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Assigned Workout Programmes</h2>
            <p className="text-sm text-[#626A62]">Structured routines prescribed by your personal trainers</p>

            <div className="space-y-6">
              {programs.map((p) => (
                <div key={p.assignment_id} className="card-cult p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="pill-badge bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10 mb-1">
                        {p.category} • {p.difficulty_level}
                      </span>
                      <h3 className="text-xl font-black text-[#24483B]">{p.title}</h3>
                      <p className="text-xs text-[#626A62] mt-0.5">{p.description}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#626A62]">Assigned by:</span>
                      <strong className="block text-sm text-[#24483B]">{p.trainer_name}</strong>
                    </div>
                  </div>

                  {/* Completion percentage bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-[#626A62]">
                      <span>Program Progress</span>
                      <span>{p.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-[#F2EEE5] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#24483B] h-full rounded-full" style={{ width: `${p.completion_percentage}%` }}></div>
                    </div>
                  </div>

                  {/* Routine Days */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#24483B]/10">
                    {p.exercises?.map((dayRoutine, idx) => (
                      <div key={idx} className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/5">
                        <h4 className="text-xs font-extrabold text-[#24483B] mb-2">{dayRoutine.day}</h4>
                        <ul className="space-y-1.5 text-xs text-[#626A62]">
                          {dayRoutine.exercises?.map((ex, exIdx) => (
                            <li key={exIdx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6F8761]"></span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 12: PROFILE, BIOMETRICS & AUTOMATIC BMI CALCULATION */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (() => {
          const currentWeight = memberProfile?.weight_kg || currentUser?.weight_kg || 72;
          const currentHeight = memberProfile?.height_cm || currentUser?.height_cm || 175;
          const currentBmi = memberProfile?.bmi || calcBmi(currentWeight, currentHeight) || 23.51;
          const bmiInfo = getBmiCategory(currentBmi);
          const liveModalBmi = calcBmi(editForm.weight_kg, editForm.height_cm);
          const liveModalBmiInfo = getBmiCategory(liveModalBmi);

          return (
            <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6F8761]">Account & Health Identity</span>
                  <h2 className="text-3xl font-black text-[#24483B] tracking-tight">Member Profile & Biometrics</h2>
                  <p className="text-xs text-[#626A62] mt-0.5">
                    Personal identity, automated Body Mass Index (BMI) assessment, and registered credentials.
                  </p>
                </div>
                <button
                  onClick={openEditProfile}
                  className="bg-[#24483B] hover:bg-[#1A362C] text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                >
                  <Edit3 className="w-4 h-4 text-[#B8C8AD]" />
                  Edit Profile & Biometrics
                </button>
              </div>

              {/* Core Profile Card */}
              <div className="card-cult p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#24483B]/10">
                  <div className="flex items-center gap-5">
                    <UserAvatar 
                      user={{ 
                        ...currentUser, 
                        ...memberProfile,
                        avatar_url: memberProfile?.avatar_url || currentUser?.avatar_url 
                      }} 
                      size="2xl" 
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-[#24483B]">{memberProfile?.full_name || currentUser?.full_name || 'Tejaswi Gunda'}</h3>
                        <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                          Active Member
                        </span>
                      </div>
                      <p className="text-xs text-[#626A62] mt-0.5">
                        @{currentUser?.username || memberProfile?.username || 'tejaswi'} • {memberProfile?.email || currentUser?.email || 'tejaswi@apexfit.com'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[11px] font-mono text-[#24483B] bg-[#FAF8F3] px-2.5 py-1 rounded-lg border border-[#24483B]/10">
                          Code: {memberProfile?.member_code || 'MEM-001'}
                        </span>
                        <span className="text-[11px] text-[#626A62] bg-[#FAF8F3] px-2.5 py-1 rounded-lg border border-[#24483B]/10">
                          Phone: {memberProfile?.phone || '+91-98765-00001'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Physical Profile & Automatic BMI Calculation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#24483B] flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-700" />
                      Physical Biometrics & Automatic BMI Calculation
                    </h4>
                    <span className="text-[11px] text-[#6F8761] font-semibold">
                      Automated MySQL & Runtime Calculation
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-center">
                      <span className="text-[11px] font-bold text-[#626A62] block mb-1">Gender</span>
                      <strong className="text-lg font-black text-[#24483B]">{memberProfile?.gender || currentUser?.gender || 'Male'}</strong>
                    </div>
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-center">
                      <span className="text-[11px] font-bold text-[#626A62] block mb-1">Age</span>
                      <strong className="text-lg font-black text-[#24483B]">{memberProfile?.age || currentUser?.age || 25} <span className="text-xs font-semibold text-[#626A62]">yrs</span></strong>
                    </div>
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-center">
                      <span className="text-[11px] font-bold text-[#626A62] block mb-1">Weight</span>
                      <strong className="text-lg font-black text-[#24483B]">{currentWeight} <span className="text-xs font-semibold text-[#626A62]">kg</span></strong>
                    </div>
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-center">
                      <span className="text-[11px] font-bold text-[#626A62] block mb-1">Height</span>
                      <strong className="text-lg font-black text-[#24483B]">{currentHeight} <span className="text-xs font-semibold text-[#626A62]">cm</span></strong>
                    </div>
                  </div>

                  {/* Prominent BMI Score Card */}
                  <div className="bg-gradient-to-br from-[#24483B] to-[#1E3B30] text-white p-6 rounded-3xl shadow-md space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#B8C8AD]">Body Mass Index (BMI)</span>
                          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">
                            Auto-Computed
                          </span>
                        </div>
                        <div className="flex items-baseline gap-3 mt-1">
                          <span className="text-4xl sm:text-5xl font-black text-white">{currentBmi}</span>
                          <span className="text-sm font-semibold text-white/70">kg/m²</span>
                        </div>
                      </div>

                      <div className="sm:text-right">
                        <span className="text-xs text-white/70 block mb-1 font-semibold">Biometric Classification</span>
                        <span className="inline-block px-3.5 py-1.5 rounded-xl font-black text-xs uppercase tracking-wider bg-white text-[#24483B] shadow-sm">
                          {bmiInfo.label}
                        </span>
                      </div>
                    </div>

                    {/* Segmented Range Bar */}
                    <div className="pt-2">
                      <div className="grid grid-cols-4 gap-1.5 h-3 rounded-full overflow-hidden bg-white/10 p-0.5">
                        <div className={`h-full rounded-full transition-all ${currentBmi < 18.5 ? 'bg-amber-400 ring-2 ring-white' : 'bg-amber-400/50'}`} title="Underweight (< 18.5)"></div>
                        <div className={`h-full rounded-full transition-all ${currentBmi >= 18.5 && currentBmi < 25.0 ? 'bg-emerald-400 ring-2 ring-white' : 'bg-emerald-400/50'}`} title="Normal Weight (18.5 - 24.9)"></div>
                        <div className={`h-full rounded-full transition-all ${currentBmi >= 25.0 && currentBmi < 30.0 ? 'bg-orange-400 ring-2 ring-white' : 'bg-orange-400/50'}`} title="Overweight (25.0 - 29.9)"></div>
                        <div className={`h-full rounded-full transition-all ${currentBmi >= 30.0 ? 'bg-red-400 ring-2 ring-white' : 'bg-red-400/50'}`} title="Obese (>= 30.0)"></div>
                      </div>
                      <div className="grid grid-cols-4 text-[10px] font-semibold text-white/70 mt-1 text-center">
                        <span>&lt; 18.5 (Under)</span>
                        <span className="text-emerald-300 font-bold">18.5 - 24.9 (Normal)</span>
                        <span>25.0 - 29.9 (Over)</span>
                        <span>&ge; 30.0 (Obese)</span>
                      </div>
                    </div>

                    {/* Calculation Formula & Health Advisory */}
                    <div className="bg-white/10 rounded-2xl p-3.5 text-xs text-white/90 space-y-1.5 border border-white/10">
                      <div className="font-mono text-[11px] text-[#B8C8AD]">
                        Formula: BMI = Weight / (Height in meters)² = {currentWeight} / ({(currentHeight / 100).toFixed(2)})² = {currentBmi}
                      </div>
                      <div className="text-[11px] leading-relaxed">
                        <strong>Health Guidance:</strong> {bmiInfo.desc}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Residential & Emergency Contacts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#24483B]/10">
                  <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-xs">
                    <span className="text-[#626A62] font-bold block mb-1 uppercase tracking-wider text-[10px]">Residential Address</span>
                    <strong className="text-[#24483B] text-sm block">{memberProfile?.address || 'Bengaluru, Karnataka'}</strong>
                    <span className="text-[11px] text-[#626A62] mt-1 block">Registered Club: ApexFit Koramangala Hub</span>
                  </div>

                  <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-xs">
                    <span className="text-[#626A62] font-bold block mb-1 uppercase tracking-wider text-[10px]">Emergency Contact</span>
                    <strong className="text-[#24483B] text-sm block">{memberProfile?.emergency_contact || 'Family Member'}</strong>
                    <span className="text-[11px] text-[#626A62] mt-1 block">Phone: {memberProfile?.emergency_phone || '+91-98765-11111'}</span>
                  </div>
                </div>
              </div>

              {/* Edit Profile & Biometrics Modal */}
              {isEditingProfile && (
                <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 border border-[#24483B]/10 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-[#24483B]/10 mb-5">
                      <div>
                        <h3 className="font-black text-lg text-[#24483B]">Edit Profile & Biometrics</h3>
                        <p className="text-xs text-[#626A62]">Updates name, gender, age, weight, height with live BMI calculation.</p>
                      </div>
                      <button 
                        onClick={() => setIsEditingProfile(false)}
                        className="p-1 rounded-xl hover:bg-[#FAF8F3] text-[#626A62] cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                      {/* Avatar preview */}
                      <div className="flex items-center gap-4 p-3 bg-[#FAF8F3] rounded-2xl border border-[#24483B]/10">
                        <UserAvatar 
                          user={{ 
                            full_name: editForm.full_name || 'Member', 
                            username: currentUser?.username,
                            avatar_url: editForm.avatar_url 
                          }} 
                          size="lg" 
                        />
                        <div className="flex-1">
                          <label className="font-bold text-[#24483B] block mb-1">
                            Profile Picture URL (Optional)
                          </label>
                          <input
                            type="url"
                            placeholder="https://... (or leave empty to use first letter)"
                            value={editForm.avatar_url}
                            onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                            className="w-full bg-white border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs text-[#24483B] focus:outline-emerald-600"
                          />
                          <span className="text-[10px] text-[#626A62] mt-0.5 block">
                            If empty, your name's first letter ("{editForm.full_name?.charAt(0)?.toUpperCase() || 'U'}") is automatically used.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="font-bold text-[#24483B] block mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B] focus:outline-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-[#24483B] block mb-1">Gender *</label>
                          <select
                            value={editForm.gender}
                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B] focus:outline-emerald-600"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="font-bold text-[#24483B] block mb-1">Age (Years) *</label>
                          <input
                            type="number"
                            required
                            min="10"
                            max="100"
                            value={editForm.age}
                            onChange={(e) => setEditForm({ ...editForm, age: parseInt(e.target.value) || '' })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B] focus:outline-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-[#24483B] block mb-1">Weight (kg) *</label>
                          <input
                            type="number"
                            required
                            step="0.5"
                            min="20"
                            max="300"
                            value={editForm.weight_kg}
                            onChange={(e) => setEditForm({ ...editForm, weight_kg: parseFloat(e.target.value) || '' })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B] focus:outline-emerald-600"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-[#24483B] block mb-1">Height (cm) *</label>
                          <input
                            type="number"
                            required
                            step="1"
                            min="80"
                            max="250"
                            value={editForm.height_cm}
                            onChange={(e) => setEditForm({ ...editForm, height_cm: parseFloat(e.target.value) || '' })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B] focus:outline-emerald-600"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="font-bold text-[#24483B] block mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B] focus:outline-emerald-600"
                          />
                        </div>
                      </div>

                      {/* Live Automatic BMI Calculation Preview Box */}
                      <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/15 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#24483B] text-xs flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-emerald-700" />
                            Live Automatic BMI Preview
                          </span>
                          {liveModalBmi && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${liveModalBmiInfo.color}`}>
                              {liveModalBmiInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-[#24483B]">
                            {liveModalBmi || '--'}
                          </span>
                          <span className="text-xs text-[#626A62]">kg/m²</span>
                          <span className="text-[11px] text-[#626A62] ml-auto font-mono">
                            {editForm.weight_kg && editForm.height_cm 
                              ? `${editForm.weight_kg}kg / (${(editForm.height_cm / 100).toFixed(2)}m)²` 
                              : 'Enter weight & height'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 bg-[#FAF8F3] hover:bg-[#F2EEE5] text-[#626A62] font-bold py-3 rounded-xl transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingProfile}
                          className="flex-1 bg-[#24483B] hover:bg-[#1A362C] text-white font-bold py-3 rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                        >
                          {savingProfile ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Save & Recalculate BMI
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
