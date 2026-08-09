import { useEffect, useMemo, useState } from 'react';
import { Briefcase, Building2, Clock, MapPin, Search, SlidersHorizontal, Wallet, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import { api } from '../api/client';

const employmentTypes = ['Полная занятость', 'Частичная занятость', 'Практика', 'Стажировка'];

export default function PublicVacanciesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(location.state?.search || '');
  const [city, setCity] = useState(location.state?.city || '');
  const [type, setType] = useState('');
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    api.allVacancies().then(data => setVacancies(Array.isArray(data) ? data : [])).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCity = city.trim().toLowerCase();
    return vacancies.filter(vacancy => {
      const searchable = [vacancy.title, vacancy.description, vacancy.company?.name, ...(vacancy.requirements || [])].join(' ').toLowerCase();
      return (!normalizedQuery || searchable.includes(normalizedQuery))
        && (!normalizedCity || (vacancy.location || '').toLowerCase().includes(normalizedCity))
        && (!type || vacancy.type === type)
        && (!salaryOnly || Boolean(vacancy.salary));
    });
  }, [city, query, salaryOnly, type, vacancies]);

  const clearFilters = () => { setQuery(''); setCity(''); setType(''); setSalaryOnly(false); };
  const hasFilters = query || city || type || salaryOnly;

  const filters = (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-on-surface">Фильтры</h2>{hasFilters && <button onClick={clearFilters} className="text-xs text-primary hover:underline">Сбросить</button>}</div>
      <div><label className="text-xs font-medium text-on-surface-variant block mb-2">Город</label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" /><input className="input-field pl-9" placeholder="Например, Алматы" value={city} onChange={event => setCity(event.target.value)} /></div></div>
      <div><p className="text-xs font-medium text-on-surface-variant mb-3">Тип занятости</p><div className="space-y-2">{employmentTypes.map(item => <label key={item} className="flex items-center gap-2.5 text-sm text-on-surface-variant cursor-pointer"><input type="radio" name="employment" checked={type === item} onChange={() => setType(item)} className="accent-primary" />{item}</label>)}</div></div>
      <label className="flex items-center gap-3 text-sm text-on-surface-variant cursor-pointer border-t border-outline-variant pt-5"><input type="checkbox" checked={salaryOnly} onChange={event => setSalaryOnly(event.target.checked)} className="accent-primary" />Только с указанной зарплатой</label>
    </div>
  );

  return (
    <div className="min-h-screen bg-background"><AppNavbar />
      <section className="border-b border-outline-variant/60 bg-surface-container/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-5">Вакансии</h1>
          <div className="flex flex-col md:flex-row gap-2">
            <label className="flex items-center gap-3 flex-1 h-12 bg-surface border border-outline-variant rounded-lg px-4 focus-within:border-primary/60"><Search className="w-4 h-4 text-outline" /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent outline-none text-sm text-on-surface placeholder:text-outline" placeholder="Должность, навык или компания" /></label>
            <button onClick={() => setMobileFilters(true)} className="btn-secondary md:hidden"><SlidersHorizontal className="w-4 h-4" /> Фильтры</button>
            <button className="btn-primary md:px-8">Найти</button>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid md:grid-cols-[240px_minmax(0,1fr)] gap-7 items-start">
        <aside className="hidden md:block glass-card p-5 sticky top-24">{filters}</aside>
        <section>
          <div className="flex items-center justify-between gap-4 mb-5"><div><h2 className="text-xl font-semibold text-on-surface">Найдено {filtered.length}</h2><p className="text-xs text-outline mt-1">Только активные вакансии работодателей</p></div><span className="hidden sm:inline-flex badge badge-outline">Сначала новые</span></div>
          {error && <div className="alert-error mb-5">{error}</div>}
          {loading ? <LoadingState count={5} /> : filtered.length ? <div className="space-y-3">{filtered.map(vacancy => (
            <article key={vacancy.id} onClick={() => navigate(`/vacancies/${vacancy.id}`)} className="glass-card card-hover p-5 sm:p-6 cursor-pointer group">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">{vacancy.title}</h3>
                  {vacancy.salary && <p className="font-semibold text-on-surface mt-2 flex items-center gap-1.5"><Wallet className="w-4 h-4 text-tertiary" />{vacancy.salary}</p>}
                  <p className="text-sm text-on-surface-variant mt-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-outline" />{vacancy.company?.name || 'Компания'}</p>
                </div>
                <span className="w-11 h-11 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center text-on-surface font-bold flex-shrink-0">{(vacancy.company?.name || 'C').slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-xs text-on-surface-variant"><span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{vacancy.location || 'Не указано'}</span><span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />{vacancy.type}</span><span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(vacancy.created_at).toLocaleDateString('ru-RU')}</span></div>
              <p className="text-sm text-on-surface-variant line-clamp-2 mt-4 leading-relaxed">{vacancy.description}</p>
              <div className="flex flex-wrap gap-2 mt-4">{(vacancy.requirements || []).slice(0, 4).map(item => <span key={item} className="skill-tag">{item}</span>)}</div>
              <button onClick={event => { event.stopPropagation(); navigate(`/vacancies/${vacancy.id}`); }} className="btn-primary mt-5">Подробнее и откликнуться</button>
            </article>
          ))}</div> : <EmptyState icon={Briefcase} title="Вакансии не найдены" description="Попробуйте изменить запрос или сбросить фильтры." action={hasFilters ? { label: 'Сбросить фильтры', onClick: clearFilters } : undefined} />}
        </section>
      </main>

      {mobileFilters && <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm p-4 flex items-end"><div className="bg-surface border border-outline-variant rounded-2xl p-6 w-full max-h-[85vh] overflow-y-auto"><div className="flex justify-end mb-2"><button className="btn-ghost p-2" onClick={() => setMobileFilters(false)}><X className="w-5 h-5" /></button></div>{filters}<button className="btn-primary w-full mt-7" onClick={() => setMobileFilters(false)}>Показать {filtered.length} вакансий</button></div></div>}
    </div>
  );
}
