import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { 
  X, 
  ShieldCheck, 
  Clock, 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CreditCard,
  Building,
  ArrowRight
} from 'lucide-react';
import { api } from '../api';

export default function PaymentModal({ order, onClose, onSuccess }) {
  const [status, setStatus] = useState(order?.status || 'CREATED');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedVpa, setSelectedVpa] = useState('tejaswi@oksbi');

  // Countdown timer
  useEffect(() => {
    if (status === 'SUCCESS' || status === 'FAILED' || status === 'EXPIRED') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCheckStatus = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getOrderStatus(order.order_ref);
      if (res.order.status === 'SUCCESS') {
        setStatus('SUCCESS');
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => onSuccess(res.order), 1500);
      } else {
        setStatus(res.order.status);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.testPaySimulate(order.order_ref, selectedVpa);
      if (res.success) {
        setStatus('SUCCESS');
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setTimeout(() => onSuccess(res), 1500);
      } else {
        setErrorMsg('Simulated payment was declined.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    setLoading(true);
    try {
      await api.cancelPayment(order.order_ref);
      setStatus('FAILED');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#24483B]/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-[#24483B]/10 overflow-hidden relative">
        
        {/* Top Header */}
        <div className="bg-[#FAF8F3] px-6 py-4 border-b border-[#24483B]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#24483B] flex items-center justify-center text-white">
              <QrCode className="w-4 h-4 text-[#B8C8AD]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#24483B]">UPI QR Checkout</h3>
              <p className="text-[11px] text-[#626A62]">Secure Payment Gateway</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-[#F2EEE5] text-[#626A62] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">

          {/* SUCCESS State */}
          {status === 'SUCCESS' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-[#24483B] mb-1">Payment Verified!</h3>
              <p className="text-sm text-[#626A62] mb-6">
                Your transaction has been confirmed and activated in the database.
              </p>
              <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-[#24483B]/10 text-left text-xs space-y-1.5 max-w-xs mx-auto mb-6">
                <div className="flex justify-between text-[#626A62]">
                  <span>Order Ref:</span>
                  <span className="font-mono font-bold text-[#24483B]">{order.order_ref}</span>
                </div>
                <div className="flex justify-between text-[#626A62]">
                  <span>Amount Paid:</span>
                  <span className="font-bold text-[#24483B]">₹{order.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#626A62]">
                  <span>Method:</span>
                  <span className="font-bold text-emerald-600">Verified UPI QR</span>
                </div>
              </div>
              <button
                onClick={() => onSuccess(order)}
                className="w-full bg-[#24483B] hover:bg-[#1A362C] text-white font-bold py-3.5 rounded-2xl shadow-md transition-all cursor-pointer"
              >
                Continue to Dashboard
              </button>
            </div>
          ) : (
            <>
              {/* Order Amount Banner */}
              <div className="bg-[#FAF8F3] rounded-2xl p-4 border border-[#24483B]/10 flex items-center justify-between mb-5">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#626A62]">Amount Payable</span>
                  <div className="text-3xl font-black text-[#24483B]">
                    ₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-[#626A62]">Order Ref:</span>
                  <div className="font-mono text-xs font-bold text-[#24483B] bg-white px-2 py-0.5 rounded-md border border-[#24483B]/10">
                    {order.order_ref}
                  </div>
                </div>
              </div>

              {/* QR Code Presentation */}
              <div className="bg-white border-2 border-dashed border-[#B8C8AD] rounded-3xl p-6 text-center shadow-xs mb-5 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#24483B]/10 mb-3">
                  <QRCodeSVG 
                    value={order.upi_qr_payload || "upi://pay?pa=apexfit@razorpay&pn=ApexFit"} 
                    size={180} 
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-[#24483B] mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-[#6F8761]" />
                  Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60 mt-1">
                  <Clock className="w-3 h-3 animate-spin" />
                  Expires in <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Academic Simulation & Test Action */}
              <div className="bg-[#F2EEE5]/70 rounded-2xl p-4 border border-[#24483B]/10 mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#24483B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#6F8761]" /> Academic Sandbox Simulator
                  </span>
                  <span className="text-[10px] bg-white font-bold text-[#24483B] px-2 py-0.5 rounded-full border border-[#24483B]/10">
                    Test Mode
                  </span>
                </div>
                <p className="text-[11px] text-[#626A62] mb-3">
                  Simulates immediate UPI authorization from customer UPI app, computing HMAC-SHA256 signature to verify database transaction.
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={selectedVpa}
                    onChange={(e) => setSelectedVpa(e.target.value)}
                    className="text-xs bg-white border border-[#24483B]/15 rounded-xl px-2.5 py-2 font-medium text-[#24483B] flex-1"
                  >
                    <option value="tejaswi@oksbi">Tejaswi Gunda (GPay - SBI)</option>
                    <option value="tejaswi@ybl">Tejaswi Gunda (PhonePe - Yes Bank)</option>
                    <option value="student@paytm">Demo Member (Paytm Payments Bank)</option>
                  </select>
                </div>

                <button
                  onClick={handleSimulatePayment}
                  disabled={loading || status === 'EXPIRED'}
                  className="w-full bg-[#24483B] hover:bg-[#1A362C] text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#B8C8AD]" />
                  {loading ? 'Processing via Gateway...' : 'Simulate UPI Approval (Authorize ₹' + order.amount.toLocaleString('en-IN') + ')'}
                </button>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckStatus}
                  disabled={loading}
                  className="flex-1 bg-white hover:bg-[#FAF8F3] border border-[#24483B]/20 text-[#24483B] text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Check Payment Status
                </button>

                <button
                  onClick={handleCancelPayment}
                  disabled={loading}
                  className="px-4 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel Order
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
