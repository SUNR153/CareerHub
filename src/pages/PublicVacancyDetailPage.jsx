import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, CheckCircle2, Clock, MapPin, Wallet } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import LoadingState from '../components/ui/LoadingState';
import { api } from '../api/client';

export default function PublicVacancyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vacancy, setVacancy] = useState(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { api.vacancy(id).then(setVacancy).catch(err => setError(err.message)); }, [id]);

  const apply = async () => {
    if (submitting || applied) return;
    setSubmitting(true);
    setError('');
    try { await api.applyToVacancy(id); setApplied(true); } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-background"><AppNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => navigate('/vacancies-public')} className="btn-ghost mb-5 -ml-3"><ArrowLeft className="w-4 h-4" /> К результатам поиска</button>
        {!vacancy ? <LoadingState /> : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
            <article className="glass-card overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-outline-variant">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-on-surface leading-tight">{vacancy.title}</h1>
                    {vacancy.salary && <p className="text-xl font-semibold text-on-surface mt-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-tertiary" />{vacancy.salary}</p>}
                  </div>
                  <span className="badge badge-indigo flex-shrink-0">{vacancy.type}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 text-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{vacancy.location}</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />Опубликовано {new Date(vacancy.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <button onClick={apply} disabled={applied || submitting} className="btn-primary mt-6 lg:hidden"><Briefcase className="w-4 h-4" />{applied ? 'Отклик отправлен' : submitting ? 'Отправка…' : 'Откликнуться'}</button>
              </div>

              <div className="p-6 sm:p-8 space-y-8">
                <section><h2 className="text-lg font-semibold text-on-surface mb-3">О вакансии</h2><p className="text-on-surface-variant leading-relaxed whitespace-pre-line">{vacancy.description}</p></section>
                <section><h2 className="text-lg font-semibold text-on-surface mb-4">Требования</h2>{(vacancy.requirements || []).length ? <ul className="space-y-3">{vacancy.requirements.map(item => <li key={item} className="flex gap-3 text-on-surface-variant"><CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" /><span>{item}</span></li>)}</ul> : <p className="text-on-surface-variant">Компания не указала отдельные требования.</p>}</section>
                {error && <div className="alert-error">{error}</div>}
              </div>
            </article>

            <aside className="hidden lg:block space-y-4 sticky top-24">
              <div className="glass-card p-5">
                <button onClick={apply} disabled={applied || submitting} className="btn-primary w-full"><Briefcase className="w-4 h-4" />{applied ? 'Отклик отправлен' : submitting ? 'Отправка…' : 'Откликнуться'}</button>
                <p className="text-xs text-outline text-center mt-3">Компания получит ваш профиль CareerHub</p>
                {error && <p className="text-xs text-error mt-3">{error}</p>}
              </div>
              <div className="glass-card p-5">
                <div className="w-12 h-12 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center mb-4"><Building2 className="w-5 h-5 text-on-surface" /></div>
                <h2 className="font-semibold text-on-surface">{vacancy.company?.name || 'Компания'}</h2>
                <button className="text-sm text-primary mt-4 hover:underline" onClick={() => vacancy.company?.id && navigate(`/companies/${vacancy.company.id}`)}>Посмотреть компанию</button>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
