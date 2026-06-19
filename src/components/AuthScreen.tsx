import React, { useState } from 'react';
import { User, Phone, Lock, Landmark, FileText, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

interface AuthScreenProps {
  onLoginSuccess: (role: 'SELLER' | 'ADMIN', user: any) => void;
  isAdminOnly?: boolean;
}

export default function AuthScreen({ onLoginSuccess, isAdminOnly = false }: AuthScreenProps) {
  const { t } = useI18n();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (isLogin) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('ERROR_REG_FAILED'));
        } else {
          onLoginSuccess(data.role, data.user);
        }
      } catch (err) {
        setError(t('ERROR_CONN'));
      } finally {
        setLoading(false);
      }
    } else {
      // Registration
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, password, cartInfo, serviceArea, profilePhoto })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || t('ERROR_REG_FAILED'));
        } else {
          setSuccessMsg(t('REG_SUCCESS'));
          setIsLogin(true);
          setPassword('');
        }
      } catch (err) {
        setError(t('ERROR_SERVER'));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-8 text-center text-white">
          <div className="inline-flex p-3 bg-white/10 rounded-full mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{isAdminOnly ? t('ADMIN_AUTH_REQ') : t('TITLE_SELLER_CENTER')}</h2>
          <p className="text-emerald-100 text-xs mt-1 leading-normal">
            {isAdminOnly 
              ? t('ADMIN_WARN')
              : isLogin ? t('SUBTITLE_LOGIN') : t('SUBTITLE_REGISTER')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 leading-normal">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded text-xs text-emerald-700 leading-normal">
              {successMsg}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">{t('LABEL_NAME')}</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder={t('PLACEHOLDER_NAME')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">{t('LABEL_PHONE')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder={isLogin ? t('PLACEHOLDER_PHONE') : "e.g. 9876543210"}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 block">{t('LABEL_PASSWORD')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">{t('LABEL_CART_INFO')}</label>
                <div className="relative">
                  <Landmark className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t('PLACEHOLDER_CART_INFO')}
                    value={cartInfo}
                    onChange={(e) => setCartInfo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">{t('LABEL_SERVICE_AREA')}</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder={t('PLACEHOLDER_SERVICE_AREA')}
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 block">{t('LABEL_PROFILE_PHOTO')}</label>
                <input
                  type="url"
                  placeholder={t('PLACEHOLDER_PHOTO')}
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none transition-all font-mono"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold rounded-lg text-sm transition-all focus:outline-none flex items-center justify-center gap-2 active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? t('FEED_BTN_LOGGING') : isLogin ? t('BUTTON_LOGIN') : t('BUTTON_SIGNUP')}
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isAdminOnly && (
            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
              {isLogin ? (
                <p>
                  {t('TOGGLE_NEED_ACCOUNT')}{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className="text-emerald-700 font-bold hover:underline bg-transparent cursor-pointer"
                  >
                    {t('BUTTON_SIGNUP')}
                  </button>
                </p>
              ) : (
                <p>
                  {t('TOGGLE_HAVE_ACCOUNT')}{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-emerald-700 font-bold hover:underline bg-transparent cursor-pointer"
                  >
                    {t('BUTTON_LOGIN')}
                  </button>
                </p>
              )}
            </div>
          )}
        </form>

        {isAdminOnly && (
          <div className="bg-slate-50 p-4 border-t border-slate-100 text-[11px] text-slate-500 text-center space-y-1.5 leading-normal" id="admin-demo-credentials">
            <p className="flex items-center justify-center gap-1 font-bold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('DEMO_CREDENTIALS')}</span>
            </p>
            <p className="font-medium text-slate-600">{t('DEMO_ADMIN_DESC')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
