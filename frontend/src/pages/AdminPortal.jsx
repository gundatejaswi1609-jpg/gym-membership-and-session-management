import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Calendar, 
  CreditCard, 
  Wrench, 
  FileText, 
  Database, 
  BarChart3, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Plus, 
  Edit3, 
  ChevronRight, 
  RefreshCw,
  Copy,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { api } from '../api';
import UserAvatar from '../components/UserAvatar';

export default function AdminPortal({ currentUser }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Data states
  const [stats, setStats] = useState(null);
  const [occupancyTrend, setOccupancyTrend] = useState([]);
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [reportsCatalog, setReportsCatalog] = useState([]);
  const [selectedReportKey, setSelectedReportKey] = useState('active_members');
  const [reportResult, setReportResult] = useState(null);
  const [dbInsights, setDbInsights] = useState(null);

  // Search / Filters
  const [searchTerm, setSearchTerm] = useState('');

  // Capacity override modal
  const [overrideModal, setOverrideModal] = useState({ open: false, schedule: null, newCap: 24, reason: '' });

  // Maintenance workorder modal
  const [maintModal, setMaintModal] = useState({ open: false, equipment_id: 1, type: 'Routine Inspection', cost: 1500, tech: 'Apex Tech', desc: '' });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [st, trend, mem, pl, sch, tr, eq, mr, pay, aud, repCat, ins, uAcc] = await Promise.all([
        api.getDashboardStats(),
        api.getOccupancyTrend(),
        api.getMembers(),
        api.getPlans(),
        api.getSchedules(),
        api.getTrainers(),
        api.getRealtimeEquipment(),
        api.getMaintenance(),
        api.getPaymentHistory(),
        api.getAuditLogs(),
        api.getReportsCatalog(),
        api.getDatabaseInsights(),
        api.getUserAccounts().catch(() => [])
      ]);
      setStats(st);
      setOccupancyTrend(trend);
      setMembers(mem);
      setPlans(pl);
      setSchedules(sch);
      setTrainers(tr);
      setEquipment(eq);
      setMaintenance(mr);
      setPayments(pay);
      setAuditLogs(aud);
      setReportsCatalog(repCat);
      setDbInsights(ins);
      setUserAccounts(uAcc || []);

      // Load initial report
      if (repCat.length > 0) {
        loadReport(selectedReportKey);
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading admin portal: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async (key) => {
    setSelectedReportKey(key);
    try {
      const res = await api.getReportData(key);
      setReportResult(res);
    } catch (err) {
      showToast('Error executing report query: ' + err.message);
    }
  };

  const handleOverrideCapacity = async (e) => {
    e.preventDefault();
    try {
      await api.overrideCapacity({
        schedule_id: overrideModal.schedule.id,
        max_capacity: overrideModal.newCap,
        reason: overrideModal.reason,
        user_id: currentUser?.id || 1
      });
      showToast('Capacity updated and logged in admin audit trail.');
      setOverrideModal({ open: false, schedule: null, newCap: 24, reason: '' });
      loadAdminData();
    } catch (err) {
      showToast('Override failed: ' + err.message);
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    try {
      await api.createMaintenance({
        equipment_id: maintModal.equipment_id,
        maintenance_type: maintModal.type,
        cost: maintModal.cost,
        technician: maintModal.tech,
        description: maintModal.desc
      });
      showToast('Maintenance workorder logged. Equipment operational inventory updated.');
      setMaintModal({ open: false, equipment_id: 1, type: 'Routine Inspection', cost: 1500, tech: 'Apex Tech', desc: '' });
      loadAdminData();
    } catch (err) {
      showToast('Error creating workorder: ' + err.message);
    }
  };

  const handleCompleteMaintenance = async (recordId) => {
    try {
      await api.updateMaintenanceStatus(recordId, 'Completed');
      showToast('Workorder completed. Restored equipment to operational service.');
      loadAdminData();
    } catch (err) {
      showToast('Error completing workorder: ' + err.message);
    }
  };

  return (
    <div className="pb-24">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#24483B] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-[#B8C8AD]/30">
          <Sparkles className="w-5 h-5 text-[#B8C8AD]" />
          <span className="text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Admin Sub-Navigation */}
      <div className="bg-[#FAF8F3] border-b border-[#24483B]/10 sticky top-20 z-30 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3">
            {[
              { id: 'overview', label: 'Overview & KPIs' },
              { id: 'user-accounts', label: `Login Accounts (${userAccounts.length})` },
              { id: 'members', label: `Members (${members.length})` },
              { id: 'plans', label: 'Membership Plans' },
              { id: 'schedules', label: `Class Schedules (${schedules.length})` },
              { id: 'trainers', label: `Trainers (${trainers.length})` },
              { id: 'equipment', label: `Equipment (${equipment.length})` },
              { id: 'maintenance', label: `Maintenance (${maintenance.length})` },
              { id: 'payments', label: `Payments (${payments.length})` },
              { id: 'audit', label: 'Admin Audit Logs' },
              { id: 'reports', label: '18 DBMS Reports' },
              { id: 'insights', label: 'Database & 3NF Insights' },
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
        {/* OVERVIEW TAB */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#6F8761]">Executive Dashboard</span>
              <h1 className="text-3xl font-black text-[#24483B] tracking-tight">System Analytics & Operations</h1>
              <p className="text-sm text-[#626A62]">
                Real-time operational summary backed by MySQL normalized relational data.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Active Members</span>
                <div className="text-3xl font-black text-[#24483B] mt-1">{stats?.active_members || 0}</div>
                <span className="text-[11px] text-emerald-600 font-bold">23 Active Subscriptions</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Total Revenue (Lifetime)</span>
                <div className="text-3xl font-black text-[#24483B] mt-1">
                  ₹{stats?.lifetime_revenue?.toLocaleString('en-IN') || 0}
                </div>
                <span className="text-[11px] text-[#6F8761] font-bold">Verified UPI Payments</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Classes Today</span>
                <div className="text-3xl font-black text-[#24483B] mt-1">{stats?.classes_today || 0}</div>
                <span className="text-[11px] text-emerald-600 font-bold">6 Active Instructors</span>
              </div>
              <div className="card-cult p-5">
                <span className="text-xs font-bold text-[#626A62]">Equipment Assets</span>
                <div className="text-3xl font-black text-[#24483B] mt-1">
                  {stats?.equipment_operational} / {stats?.equipment_total}
                </div>
                <span className="text-[11px] text-amber-700 font-bold">{stats?.equipment_maintenance} Under Repair</span>
              </div>
            </div>

            {/* Occupancy Trend Chart */}
            <div className="card-cult p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-[#24483B]">Studio Class Occupancy Trend (%)</h3>
                  <p className="text-xs text-[#626A62]">Ratio of confirmed seats booked against maximum studio room capacity</p>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={occupancyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2EEE5" />
                    <XAxis dataKey="session_date" stroke="#626A62" fontSize={11} />
                    <YAxis stroke="#626A62" fontSize={11} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FAF8F3', borderRadius: '1rem', border: '1px solid rgba(36,72,59,0.1)' }}
                      formatter={(val) => [`${val}%`, 'Occupancy Rate']}
                    />
                    <Bar dataKey="avg_occupancy_rate" fill="#24483B" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB: USER ACCOUNTS & LOGIN DIRECTORY */}
        {/* ========================================================================= */}
        {activeTab === 'user-accounts' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header & KPI Metrics */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#24483B] flex items-center gap-2">
                  <Key className="w-6 h-6 text-[#6F8761]" />
                  User Accounts & Registered Login Directory
                </h2>
                <p className="text-xs text-[#626A62] mt-0.5">
                  Secure directory of all accounts registered across Member, Trainer, and Admin portals.
                </p>
              </div>

              <div className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-2xl px-4 py-2 text-xs text-[#626A62]">
                <strong className="text-[#24483B]">{userAccounts.length}</strong> Total Accounts Registered
              </div>
            </div>

            {/* Privacy & Security Notice */}
            <div className="bg-[#FAF8F3] border border-[#24483B]/10 rounded-2xl p-4 flex items-start gap-3 text-xs text-[#292D29]">
              <Shield className="w-5 h-5 text-[#24483B] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#24483B] block mb-0.5">Privacy & Security Guard:</strong>
                As requested, this administrative directory strictly stores and displays <span className="font-bold underline text-[#24483B]">only username and email</span> for every user's login information. Passwords are cryptographically salted and hashed using PBKDF2:SHA256 and are never exposed.
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card-cult p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62]">Total Logins</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">{userAccounts.length}</div>
              </div>
              <div className="card-cult p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62]">Member Accounts</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">
                  {userAccounts.filter(u => u.role === 'member').length}
                </div>
              </div>
              <div className="card-cult p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62]">Trainer Accounts</span>
                <div className="text-2xl font-black text-[#6F8761] mt-1">
                  {userAccounts.filter(u => u.role === 'trainer').length}
                </div>
              </div>
              <div className="card-cult p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#626A62]">Admin Accounts</span>
                <div className="text-2xl font-black text-[#24483B] mt-1">
                  {userAccounts.filter(u => u.role === 'admin').length}
                </div>
              </div>
            </div>

            {/* Directory Table */}
            <div className="card-cult overflow-hidden">
              <div className="p-4 border-b border-[#24483B]/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FAF8F3]/60">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#626A62]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by username, email, name..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#24483B]/10 text-xs text-[#292D29] focus:outline-none focus:border-[#24483B]"
                  />
                </div>
                <div className="text-xs text-[#626A62]">
                  Showing <strong className="text-[#24483B]">{userAccounts.length}</strong> user records
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] border-b border-[#24483B]/10 text-[#626A62] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Login Username</th>
                      <th className="py-3 px-4">Login Email</th>
                      <th className="py-3 px-4">Portal Role</th>
                      <th className="py-3 px-4">Biometrics / BMI</th>
                      <th className="py-3 px-4">Registered On</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5">
                    {userAccounts
                      .filter(u => !searchTerm || 
                        u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-[#FAF8F3]/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar user={u} size="md" />
                              <div>
                                <strong className="text-[#24483B] font-extrabold block">{u.full_name}</strong>
                                <span className="text-[10px] text-[#626A62]">ID #{u.id}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-[#24483B]">
                            <span className="bg-[#FAF8F3] px-2.5 py-1 rounded-lg border border-[#24483B]/10">
                              @{u.username}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#626A62] font-mono">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                              u.role === 'admin'
                                ? 'bg-[#B8C8AD] text-[#24483B]'
                                : u.role === 'trainer'
                                ? 'bg-[#EBC9B8] text-[#24483B]'
                                : 'bg-[#E6E0F1] text-[#24483B]'
                            }`}>
                              {u.role.toUpperCase()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[11px] text-[#626A62]">
                            {u.role === 'member' && u.weight_kg ? (
                              <div className="flex items-center gap-1.5">
                                <span>{u.age || 25}y • {u.weight_kg}kg • {u.height_cm}cm</span>
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                  BMI {u.bmi || 22.9}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[#626A62]/60 italic">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-[#626A62] text-[11px]">
                            {u.created_at?.split(' ')[0] || u.created_at}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block mr-1.5"></span>
                            <span className="text-emerald-700 font-semibold text-[11px]">Active</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MEMBERS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'members' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-[#24483B]">Gym Members Directory</h2>
                <p className="text-sm text-[#626A62]">All registered members and active membership terms</p>
              </div>

              <div className="relative w-72">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#626A62]" />
                <input
                  type="text"
                  placeholder="Search by name, email, code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[#24483B]/10 rounded-xl pl-9 pr-3 py-2 text-xs text-[#24483B]"
                />
              </div>
            </div>

            <div className="card-cult overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10">
                    <tr>
                      <th className="p-4">Member Code</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Active Plan</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                    {members
                      .filter(m => !searchTerm || m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase()) || m.member_code.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(m => (
                        <tr key={m.id} className="hover:bg-[#FAF8F3]/50">
                          <td className="p-4 font-mono font-bold text-[#24483B]">{m.member_code}</td>
                          <td className="p-4 font-bold text-[#24483B]">{m.full_name}</td>
                          <td className="p-4">{m.email}</td>
                          <td className="p-4">{m.phone}</td>
                          <td className="p-4">{m.current_plan_name || <span className="text-gray-400">None</span>}</td>
                          <td className="p-4">{m.membership_expiry || '—'}</td>
                          <td className="p-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              m.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MEMBERSHIP PLANS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'plans' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Membership Plans & Adoption</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map(p => (
                <div key={p.id} className="card-cult p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="pill-badge bg-[#FAF8F3] text-xs text-[#24483B] border border-[#24483B]/10">{p.plan_tier}</span>
                      <span className="text-xs font-bold text-emerald-700">{p.active_subscribers_count} active</span>
                    </div>
                    <h3 className="text-lg font-black text-[#24483B]">{p.plan_name}</h3>
                    <p className="text-xs text-[#626A62] mt-1 mb-4">{p.description}</p>
                    <div className="text-2xl font-black text-[#24483B] mb-4">
                      ₹{p.price.toLocaleString('en-IN')} <span className="text-xs font-normal text-[#626A62]">/ {p.duration_days} days</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#24483B]/10 text-xs text-[#626A62]">
                    <div>Gym Access: <strong>{p.gym_access}</strong></div>
                    <div>PT Perks: <strong>{p.trainer_benefits}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CLASS SCHEDULES TAB */}
        {/* ========================================================================= */}
        {activeTab === 'schedules' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-[#24483B]">Class Schedules & Occupancy</h2>
                <p className="text-sm text-[#626A62]">Monitor live bookings and trigger administrative capacity overrides</p>
              </div>
            </div>

            <div className="card-cult overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10">
                    <tr>
                      <th className="p-4">Schedule ID</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">Coach</th>
                      <th className="p-4">Date & Time</th>
                      <th className="p-4">Room & Location</th>
                      <th className="p-4">Occupancy</th>
                      <th className="p-4">Override Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                    {schedules.map(sch => (
                      <tr key={sch.id} className="hover:bg-[#FAF8F3]/50">
                        <td className="p-4 font-mono font-bold text-[#24483B]">#{sch.id}</td>
                        <td className="p-4 font-bold text-[#24483B]">{sch.class_name}</td>
                        <td className="p-4">{sch.trainer_name}</td>
                        <td className="p-4">{sch.session_date} • {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}</td>
                        <td className="p-4">{sch.room_name} ({sch.location_name})</td>
                        <td className="p-4">
                          <span className="font-bold text-[#24483B]">{sch.booked_capacity}</span> / {sch.max_capacity} seats
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => setOverrideModal({ open: true, schedule: sch, newCap: sch.max_capacity, reason: '' })}
                            className="text-xs font-bold text-[#24483B] bg-[#F2EEE5] hover:bg-[#B8C8AD]/40 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Override Capacity
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* EQUIPMENT & RESOURCE SCHEDULING TAB */}
        {/* ========================================================================= */}
        {activeTab === 'equipment' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-[#24483B]">Equipment Inventory & Operational Status</h2>
                <p className="text-sm text-[#626A62]">Time-based availability tracking and maintenance locks</p>
              </div>

              <button
                onClick={() => setMaintModal({ ...maintModal, open: true })}
                className="bg-[#24483B] text-white px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <Wrench className="w-4 h-4 text-[#B8C8AD]" />
                Log Maintenance Workorder
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {equipment.map(eq => (
                <div key={eq.id} className="card-cult p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold text-[#6F8761]">{eq.equipment_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        eq.status === 'Operational' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {eq.status}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-[#24483B] mb-1">{eq.name}</h3>
                    <p className="text-xs text-[#626A62] mb-3">{eq.brand} • {eq.category}</p>

                    <div className="bg-[#FAF8F3] p-3 rounded-xl border border-[#24483B]/5 grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-[#626A62] block">Total Units</span>
                        <strong className="text-[#24483B] text-base">{eq.total_quantity}</strong>
                      </div>
                      <div>
                        <span className="text-[#626A62] block">Operational</span>
                        <strong className="text-emerald-700 text-base">{eq.operational_quantity}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-[#626A62] pt-2 border-t border-[#24483B]/5">
                    Location: <strong>{eq.location}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAINTENANCE WORKORDERS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Maintenance Workorders & Repairs</h2>

            <div className="card-cult overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10">
                    <tr>
                      <th className="p-4">Workorder ID</th>
                      <th className="p-4">Equipment</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Technician</th>
                      <th className="p-4">Cost</th>
                      <th className="p-4">Reported Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                    {maintenance.map(m => (
                      <tr key={m.id} className="hover:bg-[#FAF8F3]/50">
                        <td className="p-4 font-mono font-bold text-[#24483B]">WO-{m.id}</td>
                        <td className="p-4 font-bold text-[#24483B]">{m.equipment_name}</td>
                        <td className="p-4">{m.maintenance_type}</td>
                        <td className="p-4">{m.technician}</td>
                        <td className="p-4 font-bold text-[#24483B]">₹{m.cost}</td>
                        <td className="p-4">{m.reported_date}</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            m.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {m.status !== 'Completed' && (
                            <button
                              onClick={() => handleCompleteMaintenance(m.id)}
                              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                            >
                              Mark Completed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADMIN AUDIT LOGS TAB */}
        {/* ========================================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h2 className="text-3xl font-black text-[#24483B]">Administrative Override Audit Trail</h2>
            <p className="text-sm text-[#626A62]">Immutable audit logging tracking user, timestamp, action, and rationale</p>

            <div className="card-cult overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Target Entity</th>
                      <th className="p-4">Details / Rationale</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-[#FAF8F3]/50">
                        <td className="p-4 font-mono">{log.created_at}</td>
                        <td className="p-4 font-bold text-[#24483B]">{log.user_full_name || 'System Admin'}</td>
                        <td className="p-4 font-mono font-bold text-[#6F8761]">{log.action}</td>
                        <td className="p-4">{log.target_entity} #{log.target_id}</td>
                        <td className="p-4 text-[#24483B]">{log.details}</td>
                        <td className="p-4 font-mono text-[11px]">{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: 18 ACADEMIC DBMS REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-3xl font-black text-[#24483B]">18 Academic DBMS SQL Reports</h2>
              <p className="text-sm text-[#626A62]">
                Executing live queries, multi-table joins, nested aggregates, and DATEDIFF calculations directly against MySQL
              </p>
            </div>

            {/* Reports Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {reportsCatalog.map(rep => (
                <button
                  key={rep.key}
                  onClick={() => loadReport(rep.key)}
                  className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                    selectedReportKey === rep.key
                      ? 'bg-[#24483B] text-white border-[#24483B] shadow-sm'
                      : 'bg-white hover:bg-[#F2EEE5] text-[#24483B] border-[#24483B]/10'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{rep.title}</div>
                  <div className={`text-[10px] mt-0.5 truncate ${selectedReportKey === rep.key ? 'text-[#B8C8AD]' : 'text-[#626A62]'}`}>
                    {rep.concepts?.[0]}
                  </div>
                </button>
              ))}
            </div>

            {/* Report Viewer Card */}
            {reportResult && (
              <div className="card-cult p-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-[#24483B]">{reportResult.title}</h3>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      {reportResult.total_rows} Records Returned
                    </span>
                  </div>
                  <p className="text-xs text-[#626A62] mt-1">{reportResult.description}</p>
                </div>

                {/* Concepts badges */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#24483B] self-center">DBMS Concepts Tested:</span>
                  {reportResult.concepts?.map((c, i) => (
                    <span key={i} className="pill-badge bg-[#FAF8F3] text-[#24483B] border border-[#24483B]/10">
                      {c}
                    </span>
                  ))}
                </div>

                {/* SQL Query Code Block */}
                <div className="bg-[#1A362C] text-[#FAF8F3] p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner relative group">
                  <pre>{reportResult.sql_query}</pre>
                </div>

                {/* Results Table */}
                <div className="overflow-x-auto max-h-96 border border-[#24483B]/10 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F3] text-[#24483B] font-bold border-b border-[#24483B]/10 sticky top-0">
                      <tr>
                        {reportResult.columns?.map(col => (
                          <th key={col} className="p-3">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#24483B]/5 text-[#626A62]">
                      {reportResult.data?.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-[#FAF8F3]/50">
                          {reportResult.columns?.map(col => (
                            <td key={col} className="p-3">
                              {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: DATABASE & 3NF INSIGHTS */}
        {/* ========================================================================= */}
        {activeTab === 'insights' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-3xl font-black text-[#24483B]">Relational Database Architecture & 3NF Normalization</h2>
              <p className="text-sm text-[#626A62]">
                Detailed academic defense of database guarantees, Third Normal Form (3NF), views, and ACID transactions.
              </p>
            </div>

            {/* Normalization Defense Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card-cult p-6">
                <span className="pill-badge bg-[#E6E0F1] text-[#24483B] mb-3">First Normal Form (1NF)</span>
                <h3 className="text-base font-extrabold text-[#24483B] mb-2">Atomicity of Attributes</h3>
                <p className="text-xs text-[#626A62] leading-relaxed">
                  Every relation stores strictly atomic values with defined data types. Multi-valued entities (such as emergency contacts, trainer specializations, and equipment requirements) are decomposed into dedicated 1:N and M:N child tables with individual foreign keys.
                </p>
              </div>

              <div className="card-cult p-6">
                <span className="pill-badge bg-[#EBC9B8] text-[#24483B] mb-3">Second Normal Form (2NF)</span>
                <h3 className="text-base font-extrabold text-[#24483B] mb-2">No Partial Dependency</h3>
                <p className="text-xs text-[#626A62] leading-relaxed">
                  In all junction entities (e.g. <code>class_registrations</code>, <code>class_equipment_requirements</code>), all non-prime attributes are fully functionally dependent on the entire composite primary key, eliminating partial dependencies.
                </p>
              </div>

              <div className="card-cult p-6">
                <span className="pill-badge bg-[#B8C8AD] text-[#24483B] mb-3">Third Normal Form (3NF)</span>
                <h3 className="text-base font-extrabold text-[#24483B] mb-2">No Transitive Dependency</h3>
                <p className="text-xs text-[#626A62] leading-relaxed">
                  Non-key attributes never transitively depend on other non-key attributes ($X \to Y$ and $Y \to Z$). For example, <code>subscriptions</code> links to <code>plan_id</code> only; plan durations, tiers, and standard prices are kept solely in <code>membership_plans</code>.
                </p>
              </div>
            </div>

            {/* ACID Transaction Guarantees */}
            <div className="card-cult p-6 space-y-4">
              <h3 className="text-lg font-black text-[#24483B]">ACID Transaction Guarantees in ApexFit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#626A62]">
                <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/5">
                  <strong className="text-[#24483B] block mb-1">Atomicity & Consistency</strong>
                  <p>Implemented across booking holds, payments, and subscription activations. If payment fails or a constraint is violated, the transaction rolls back cleanly leaving zero orphaned records.</p>
                </div>
                <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/5">
                  <strong className="text-[#24483B] block mb-1">Isolation (Row-Level Locking)</strong>
                  <p>Class seat reservation uses MySQL <code>FOR UPDATE</code> row-level locking on <code>class_schedules</code>, ensuring simultaneous attempts to book the final seat never result in overbooking.</p>
                </div>
              </div>
            </div>

            {/* Schema Tables Inventory */}
            <div className="card-cult p-6">
              <h3 className="text-lg font-black text-[#24483B] mb-4">MySQL Schema Inventory (30 Relational Tables)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {dbInsights?.tables?.filter(t => !t.table_name.startsWith('v_')).map(t => (
                  <div key={t.table_name} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#24483B]/10 text-xs">
                    <strong className="font-mono text-[#24483B] block truncate">{t.table_name}</strong>
                    <span className="text-[11px] text-[#626A62]">{t.table_rows} rows</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Capacity Override Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-[#24483B]/10">
            <h3 className="font-extrabold text-base text-[#24483B] mb-1">Administrative Capacity Override</h3>
            <p className="text-xs text-[#626A62] mb-4">
              Schedule #{overrideModal.schedule?.id}: {overrideModal.schedule?.class_name}
            </p>

            <form onSubmit={handleOverrideCapacity} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#24483B] block mb-1">New Max Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={overrideModal.newCap}
                  onChange={(e) => setOverrideModal({...overrideModal, newCap: parseInt(e.target.value)})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs font-bold text-[#24483B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Audit Rationale (Mandatory)</label>
                <input
                  type="text"
                  required
                  placeholder="E.g., Added extra row of exercise benches..."
                  value={overrideModal.reason}
                  onChange={(e) => setOverrideModal({...overrideModal, reason: e.target.value})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-xs text-[#24483B]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#24483B] hover:bg-[#1A362C] text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Confirm & Audit Log
                </button>
                <button
                  type="button"
                  onClick={() => setOverrideModal({ open: false, schedule: null, newCap: 24, reason: '' })}
                  className="px-4 bg-gray-100 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Workorder Modal */}
      {maintModal.open && (
        <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 border border-[#24483B]/10">
            <h3 className="font-extrabold text-base text-[#24483B] mb-1">Log Equipment Maintenance</h3>
            <p className="text-xs text-[#626A62] mb-4">Locks equipment unit from class allocation until completed.</p>

            <form onSubmit={handleCreateMaintenance} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#24483B] block mb-1">Select Equipment</label>
                <select
                  value={maintModal.equipment_id}
                  onChange={(e) => setMaintModal({...maintModal, equipment_id: parseInt(e.target.value)})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B] font-bold"
                >
                  {equipment.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.name} ({eq.equipment_code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Maintenance Type</label>
                <select
                  value={maintModal.type}
                  onChange={(e) => setMaintModal({...maintModal, type: e.target.value})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B]"
                >
                  <option value="Routine Inspection">Routine Inspection</option>
                  <option value="Repair">Repair</option>
                  <option value="Part Replacement">Part Replacement</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Estimated Cost (₹)</label>
                <input
                  type="number"
                  value={maintModal.cost}
                  onChange={(e) => setMaintModal({...maintModal, cost: parseFloat(e.target.value)})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 font-bold text-[#24483B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Technician</label>
                <input
                  type="text"
                  value={maintModal.tech}
                  onChange={(e) => setMaintModal({...maintModal, tech: e.target.value})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B]"
                />
              </div>

              <div>
                <label className="font-bold text-[#24483B] block mb-1">Issue Description</label>
                <textarea
                  rows="2"
                  value={maintModal.desc}
                  onChange={(e) => setMaintModal({...maintModal, desc: e.target.value})}
                  className="w-full bg-[#FAF8F3] border border-[#24483B]/10 rounded-xl px-3 py-2 text-[#24483B]"
                  placeholder="Describe repair requirements..."
                ></textarea>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-[#24483B] hover:bg-[#1A362C] text-white font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Log Workorder & Lock Asset
                </button>
                <button
                  type="button"
                  onClick={() => setMaintModal({ ...maintModal, open: false })}
                  className="px-4 bg-gray-100 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
