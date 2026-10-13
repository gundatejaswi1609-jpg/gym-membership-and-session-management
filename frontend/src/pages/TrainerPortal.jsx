import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Plus, 
  Trash2, 
  MapPin, 
  Users, 
  Award, 
  Activity, 
  FileText, 
  ShieldCheck, 
  ChevronRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import UserAvatar from '../components/UserAvatar';

export default function TrainerPortal({ currentUser, onSwitchRole }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [trainerProfile, setTrainerProfile] = useState(null);
  const [sessions, setSessions] = useState({ classes: [], personal_training: [] });
  const [availability, setAvailability] = useState([]);
  const [toastMsg, setToastMsg] = useState('');

  // Assessment modal
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    member_id: 1,
    weight_kg: 72,
    height_cm: 175,
    body_fat_percentage: 16.5,
    muscle_mass_kg: 35.0,
    systolic_bp: 120,
    diastolic_bp: 80,
    target_goals: 'Build 2kg lean muscle mass and enhance mobility',
    notes: 'Good baseline condition.'
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const trainerId = currentUser?.trainer_id || 1;

  useEffect(() => {
    loadTrainerData();
  }, [trainerId]);

  const loadTrainerData = async () => {
    setLoading(true);
    try {
      const [prof, sess, avail] = await Promise.all([
        api.getTrainer(trainerId),
        api.getTrainerSessions(trainerId, new Date().toISOString().split('T')[0]),
        api.getTrainerAvailability(trainerId)
      ]);
      setTrainerProfile(prof);
      setSessions(sess);
      setAvailability(avail);
    } catch (err) {
      console.error(err);
      showToast('Error loading trainer portal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = async (regId, ptId, memberId, status) => {
    try {
      await api.recordAttendance(trainerId, {
        registration_id: regId,
        pt_booking_id: ptId,
        member_id: memberId,
        attendance_status: status,
        remarks: 'Recorded from Trainer Portal'
      });
      showToast(`Marked ${status}!`);
      loadTrainerData();
    } catch (err) {
      showToast('Error marking attendance: ' + err.message);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      await api.updateTrainerAvailability(trainerId, availability);
      showToast('Weekly schedule availability saved to database.');
      loadTrainerData();
    } catch (err) {
      showToast('Error saving availability: ' + err.message);
    }
  };

  const handleAddSlot = (dayOfWeek) => {
    const newSlot = {
      day_of_week: dayOfWeek,
      start_time: '09:00:00',
      end_time: '12:00:00',
      slot_type: 'any'
    };
    setAvailability([...availability, newSlot]);
  };

  const handleRemoveSlot = (index) => {
    const updated = availability.filter((_, idx) => idx !== index);
    setAvailability(updated);
  };

  const handleAddAssessment = async (e) => {
    e.preventDefault();
    try {
      await api.addAssessment({
        ...assessmentForm,
        trainer_id: trainerId
      });
      showToast('Fitness assessment successfully logged.');
      setShowAssessmentModal(false);
    } catch (err) {
      showToast('Error adding assessment: ' + err.message);
    }
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="pb-24">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24483B] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-[#B8C8AD]/30">
          <Sparkles className="w-5 h-5 text-[#B8C8AD]" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Sub-nav */}
      <div className="bg-[#FAF8F3] border-b border-[#24483B]/10 sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3">
            {[
              { id: 'dashboard', label: 'Trainer Dashboard' },
              { id: 'schedule', label: 'Weekly Availability Calendar' },
              { id: 'sessions', label: `My Sessions (${sessions.classes.length + sessions.personal_training.length})` },
              { id: 'profile', label: 'My Coach Profile' }
            ].map(tab => (
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
        {/* DASHBOARD TAB */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <UserAvatar 
                  user={{ 
                    full_name: trainerProfile?.full_name || currentUser?.full_name, 
                    username: currentUser?.username, 
                    avatar_url: trainerProfile?.image_url || currentUser?.avatar_url, 
                    role: 'trainer' 
                  }} 
                  size="xl" 
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6F8761]">Coach Portal</span>
                  <h1 className="text-3xl font-black text-[#24483B] tracking-tight">
                    Welcome, Coach {trainerProfile?.full_name?.split(' ')[0] || 'Marcus'}!
                  </h1>
                  <p className="text-sm text-[#626A62] mt-0.5">
                    Manage class attendance, view scheduled clients, and configure weekly booking availability.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAssessmentModal(true)}
                className="bg-[#24483B] hover:bg-[#1A362C] text-white px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 self-start"
              >
                <Plus className="w-4 h-4 text-[#B8C8AD]" />
                Log Biometric Assessment
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Classes Scheduled</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">{sessions.classes.length}</div>
                <span className="text-[11px] text-emerald-600 font-bold">Upcoming 14 Days</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">1-on-1 PT Appointments</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">{sessions.personal_training.length}</div>
                <span className="text-[11px] text-emerald-600 font-bold">Confirmed Clients</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Hourly Billing Rate</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">₹{trainerProfile?.session_price}</div>
                <span className="text-[11px] text-[#6F8761] font-bold">Per Session Rate</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Status</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{trainerProfile?.availability_status}</div>
                <span className="text-[11px] text-emerald-600 font-bold">Accepting Bookings</span>
              </div>
            </div>

            {/* Today's Agenda */}
            <div className="card-cult p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#24483B]/10">
                <h3 className="text-lg font-black text-[#24483B]">Today's Studio Agenda</h3>
                <span className="text-xs font-bold text-[#6F8761]">{new Date().toDateString()}</span>
              </div>

              {sessions.classes.length === 0 ? (
                <p className="text-xs text-[#626A62] py-4 text-center">No studio classes scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.classes.slice(0, 5).map(c => (
                    <div key={c.id} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#24483B]/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#24483B]">{c.class_name}</span>
                          <span className="pill-badge bg-white text-[10px] text-[#24483B] border border-[#24483B]/10">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-xs text-[#626A62] mt-1">
                          🕒 {c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)} • 📍 {c.room_name} ({c.location_name})
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#24483B] bg-white px-3 py-1 rounded-xl border border-[#24483B]/10">
                          {c.booked_capacity} / {c.max_capacity} Enrolled
                        </span>
                        <button
                          onClick={() => setActiveTab('sessions')}
                          className="bg-[#24483B] text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                        >
                          Roster & Attendance
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* AVAILABILITY CALENDAR TAB */}
        {/* ========================================================================= */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-[#24483B]">Weekly Availability Calendar</h2>
                <p className="text-sm text-[#626A62]">
                  Configure your recurring time slots stored in MySQL to allow automated member booking.
                </p>
              </div>

              <button
                onClick={handleSaveAvailability}
                className="bg-[#24483B] hover:bg-[#1A362C] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-[#B8C8AD]" />
                Save Schedule to Database
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {dayNames.map((day, dayIndex) => {
                const daySlots = availability.filter(s => s.day_of_week === dayIndex);

                return (
                  <div key={day} className="card-cult p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#24483B]/10">
                        <strong className="text-xs font-extrabold text-[#24483B]">{day.slice(0, 3)}</strong>
                        <span className="text-[10px] font-bold text-[#626A62] bg-[#FAF8F3] px-1.5 py-0.5 rounded-md">
                          {daySlots.length} slots
                        </span>
                      </div>

                      <div className="space-y-2 mb-3">
                        {daySlots.map((slot, sIdx) => (
                          <div key={sIdx} className="bg-[#FAF8F3] p-2 rounded-xl border border-[#24483B]/10 text-[11px] relative group">
                            <div className="font-mono font-bold text-[#24483B]">
                              {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                            </div>
                            <div className="text-[10px] text-[#626A62] capitalize">{slot.slot_type}</div>
                            <button
                              onClick={() => {
                                const realIdx = availability.findIndex(s => s === slot);
                                if (realIdx !== -1) handleRemoveSlot(realIdx);
                              }}
                              className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddSlot(dayIndex)}
                      className="w-full bg-[#F2EEE5] hover:bg-[#B8C8AD]/30 text-[#24483B] text-[10px] font-bold py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Slot
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SESSIONS & ATTENDANCE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'sessions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Sessions & Roster Management</h2>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-[#24483B]">Group Studio Classes</h3>
              <div className="space-y-3">
                {sessions.classes.map(c => (
                  <div key={c.id} className="card-cult p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[#24483B]">{c.class_name}</span>
                        <span className="pill-badge bg-[#FAF8F3] text-xs text-[#24483B] border border-[#24483B]/10">
                          {c.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#626A62] mt-1">
                        📅 {c.session_date} ({c.start_time.slice(0, 5)} - {c.end_time.slice(0, 5)}) • 📍 {c.room_name}
                      </div>
                      <div className="text-xs text-emerald-700 font-bold mt-1">
                        Confirmed Attendees: {c.booked_capacity} members
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAttendance(c.id, null, 1, 'Present')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Present
                      </button>
                      <button
                        onClick={() => handleAttendance(c.id, null, 1, 'Absent')}
                        className="bg-amber-100 text-amber-800 text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="text-lg font-bold text-[#24483B] pt-4">Personal Training Clients</h3>
              <div className="space-y-3">
                {sessions.personal_training.map(pt => (
                  <div key={pt.id} className="card-cult p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-extrabold text-[#24483B]">{pt.member_name} ({pt.member_code})</h4>
                      <div className="text-xs text-[#626A62] mt-0.5">
                        📅 {pt.booking_date} ({pt.start_time.slice(0, 5)} - {pt.end_time.slice(0, 5)}) • Contact: {pt.member_phone}
                      </div>
                      {pt.notes && <div className="text-xs text-[#24483B] italic mt-1">Goal: "{pt.notes}"</div>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAttendance(null, pt.id, pt.member_id, 'Present')}
                        className="bg-[#24483B] text-white text-xs font-bold px-3.5 py-2 rounded-xl cursor-pointer"
                      >
                        Complete Session
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROFILE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-[#24483B]">Trainer Profile & Credentials</h2>

            <div className="card-cult p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[#24483B]/10">
                <UserAvatar 
                  user={{ 
                    full_name: trainerProfile?.full_name || currentUser?.full_name, 
                    username: currentUser?.username, 
                    avatar_url: trainerProfile?.image_url || currentUser?.avatar_url, 
                    role: 'trainer' 
                  }} 
                  size="xl" 
                />
                <div>
                  <h3 className="text-xl font-black text-[#24483B]">{trainerProfile?.full_name}</h3>
                  <div className="text-xs font-bold text-[#6F8761]">{trainerProfile?.specialization}</div>
                  <div className="text-[11px] text-[#626A62]">{trainerProfile?.email} • {trainerProfile?.phone}</div>
                </div>
              </div>

              <div className="space-y-3 text-xs text-[#626A62]">
                <div>
                  <strong className="text-[#24483B] block mb-0.5">Biography</strong>
                  <p className="leading-relaxed">{trainerProfile?.bio}</p>
                </div>
                <div>
                  <strong className="text-[#24483B] block mb-0.5">Certifications</strong>
                  <p>{trainerProfile?.certification}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5">
                    <span className="block text-[#626A62]">Experience</span>
                    <strong className="text-[#24483B]">{trainerProfile?.experience_years} years</strong>
                  </div>
                  <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5">
                    <span className="block text-[#626A62]">1-on-1 Session Price</span>
                    <strong className="text-[#24483B]">₹{trainerProfile?.session_price}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Fitness Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-[#24483B]/10">
            <div className="flex items-center justify-between pb-3 border-b border-[#24483B]/10 mb-4">
              <h3 className="font-extrabold text-base text-[#24483B]">Log Member Fitness Assessment</h3>
              <button onClick={() => setShowAssessmentModal(false)} className="cursor-pointer text-[#626A62]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAssessment} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#24483B] block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessmentForm.weight_kg}
                    onChange={(e) => setAssessmentForm({...assessmentForm, weight_kg: parseFloat(e.target.value)})}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#24483B] block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessmentForm.height_cm}
                    onChange={(e) => setAssessmentForm({...assessmentForm, height_cm: parseFloat(e.target.value)})}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#24483B] block mb-1">Body Fat %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessmentForm.body_fat_percentage}
                    onChange={(e) => setAssessmentForm({...assessmentForm, body_fat_percentage: parseFloat(e.target.value)})}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#24483B] block mb-1">Muscle Mass (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessmentForm.muscle_mass_kg}
                    onChange={(e) => setAssessmentForm({...assessmentForm, muscle_mass_kg: parseFloat(e.target.value)})}
                    className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Target Goals</label>
                <input
                  type="text"
                  value={assessmentForm.target_goals}
                  onChange={(e) => setAssessmentForm({...assessmentForm, target_goals: e.target.value})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B]"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#24483B] hover:bg-[#1A362C] text-white font-bold py-3 rounded-xl transition-all cursor-pointer mt-4"
              >
                Save Biometrics to MySQL
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
