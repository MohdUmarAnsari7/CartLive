import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, User, FileText } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function FeedbackPage() {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorCode, setErrorCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    setSubmitting(true);
    setErrorCode('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSuccess(true);
      setName('');
      setDescription('');
    } catch (err) {
      setErrorCode('Could not connect to the server terminal. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12" id="feedback-viewport">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden" id="feedback-card">
        {/* Decorative Top header with icon */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-10 text-center text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full blur-xl -ml-6 -mb-6"></div>

          <div className="inline-flex p-3.5 bg-white/10 rounded-2xl mb-4 shadow-inner" id="feedback-icon-container">
            <MessageSquare className="w-8 h-8 text-white stroke-[2]" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">{t('FEED_HEADER')}</h2>
          <p className="text-emerald-100 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
            {t('FEED_DESC')}
          </p>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-10">
          {success ? (
            <div className="text-center py-8 space-y-4 font-sans" id="feedback-success-state">
              <div className="inline-flex p-3 bg-emerald-50 rounded-full text-emerald-600 animate-bounce">
                <CheckCircle2 className="w-12 h-12 stroke-[1.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-800">{t('FEED_SUCCESS_TITLE')}</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {t('FEED_SUCCESS_DESC')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="mt-4 px-6 py-2 bg-slate-850 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                id="feedback-reset-btn"
              >
                {t('FEED_RETRY_BTN')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6" id="feedback-submit-form">
              {errorCode && (
                <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700" id="feedback-error">
                  {errorCode}
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <label htmlFor="customer-name-input" className="text-xs font-bold text-slate-600 tracking-wide uppercase block">
                  {t('FEED_LABEL_NAME')}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    id="customer-name-input"
                    placeholder={t('FEED_PLACEHOLDER_NAME')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Feedback description field */}
              <div className="space-y-1.5">
                <label htmlFor="feedback-desc-input" className="text-xs font-bold text-slate-600 tracking-wide uppercase block">
                  {t('FEED_LABEL_DESC')}
                </label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <textarea
                    required
                    id="feedback-desc-input"
                    placeholder={t('FEED_PLACEHOLDER_DESC')}
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-800 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-750 hover:to-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm tracking-wide inline-flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-600/10 cursor-pointer"
                id="feedback-submit-btn"
              >
                {submitting ? (
                  <>{t('FEED_BTN_LOGGING')}</>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {t('FEED_BTN_SUBMIT')}
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
