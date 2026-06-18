import React, { useState } from 'react';
import { User, Phone, Lock, Landmark, FileText, ArrowRight, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (role: 'SELLER' | 'ADMIN', user: any) => void;
  isAdminOnly?: boolean;
}

export default function AuthScreen({ onLoginSuccess, isAdminOnly = false }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [cartInfo, setCartInfo] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const API_URL = 'http://localhost:3000';
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isLogin) {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed');
        } else {
          onLoginSuccess(data.role, data.user);
        }
      } catch (err) {
        setError('Connection timed out. Please check your system status.');
      } finally {
        setLoading(false);
      }
    } else {
      // Registration
      try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, password, cartInfo, serviceArea, profilePhoto })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
        } else {
          setSuccessMsg('Registration successful! Please login below.');
          setIsLogin(true);
          setPassword('');
        }
      } catch (err) {
        setError('Server network issue. Try again shortly.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/10 rounded-full mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Pourman Seller Center</h2>
          <p className="text-emerald-100 text-xs mt-1">
            {isLogin ? 'Log in to update offerings & broadcast live GPS location' : 'Register your fruit & vegetable cart in 1 minute'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-xs text-emerald-700">
              {successMsg}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Full Name (पूरा नाम) *</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Mobile Weight Number (मोबाइल नंबर) *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder={isLogin ? "e.g. 9876543210 (or 'admin')" : "e.g. 9876543210"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Cart Description (ठेला / दुकान का प्रकार)</label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Traditional Hand Cart with electronic scale"
                    value={cartInfo}
                    onChange={(e) => setCartInfo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Typical Operating Streets (मुख्य कार्य क्षेत्र) *</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Indiranagar Sector 2"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">Profile Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Paste direct .png/.jpg photo link"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg text-sm transition-all focus:outline-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing transaction...' : isLogin ? 'Access Account' : 'Register as Seller'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            {isLogin ? (
              <p>
                Interested in selling with us?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className="text-emerald-600 font-semibold hover:underline bg-transparent"
                >
                  Register Now
                </button>
              </p>
            ) : (
              <p>
                Already have a seller account?{' '}
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className="text-emerald-600 font-semibold hover:underline bg-transparent"
                >
                  Login here
                </button>
              </p>
            )}
          </div>
        </form>

        {isAdminOnly && (
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-[11px] text-slate-500 text-center space-y-1 leading-normal" id="admin-demo-credentials">
            <p>🔑 <strong>Demo Credentials</strong></p>
            <p><strong>Admin Node:</strong> Login with <code>admin</code> and password: <code>admin123</code></p>
          </div>
        )}
      </div>
    </div>
  );
}
