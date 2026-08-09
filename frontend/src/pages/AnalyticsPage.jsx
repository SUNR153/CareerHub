import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, BriefcaseBusiness, CheckCircle2, MapPin,
  Sparkles, TrendingDown, TrendingUp, UserRound, UsersRound,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import LoadingState from '../components/ui/LoadingState';

const numberFormatter = new Intl.NumberFormat('ru-RU');
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: '2-digit' });

function formatNumber(value) {
  return numberFormatter.format(Number(value) || 0);
}

function Growth({ value, suffix = '% за месяц' }) {
  const numeric = Number(value) || 0;
  const Icon = numeric < 0 ? TrendingDown : TrendingUp;
  return <span className={`inline-flex items-center gap-1 text-xs ${numeric < 0 ? 'text-error' : 'text-tertiary'}`}><Icon className="w-3.5 h-3.5" />{numeric > 0 ? '+' : ''}{numeric}{suffix}</span>;
}

function MetricCard({ label, value, growth, icon, note }) {
  return (
    <article className="glass-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs text-on-surface-variant mb-3">{label}</p><p className="text-3xl font-bold text-on-surface tracking-tight">{formatNumber(value)}</p></div>
        <span className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">{icon}</span>
      </div>
      <div className="mt-4">{growth !== undefined ? <Growth value={growth} /> : <span className="text-xs text-outline">{note}</span>}</div>
    </article>
  );
}

function TrendChart({ timeline }) {
  const width = 760;
  const height = 270;
  const padding = { left: 42, right: 18, top: 18, bottom: 38 };
  const allValues = timeline.flatMap(item => [item.vacancies, item.candidates, item.applications]);
  const maxValue = Math.max(1, ...allValues);
  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;
  const point = (value, index) => {
    const x = padding.left + (timeline.length <= 1 ? usableWidth / 2 : index * usableWidth / (timeline.length - 1));
    const y = padding.top + usableHeight - (value / maxValue) * usableHeight;
    return `${x},${y}`;
  };
  const series = [
    { key: 'applications', label: 'Отклики', className: 'stroke-primary' },
    { key: 'candidates', label: 'Кандидаты', className: 'stroke-tertiary' },
    { key: 'vacancies', label: 'Вакансии', className: 'stroke-on-surface-variant' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-4 text-xs text-on-surface-variant">{series.map(item => <span key={item.key} className="flex items-center gap-2"><i className={`w-5 h-0.5 ${item.className.replace('stroke-', 'bg-')}`} />{item.label}</span>)}</div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[620px]" role="img" aria-label="Динамика вакансий, кандидатов и откликов по месяцам">
          {[0, .25, .5, .75, 1].map(ratio => {
            const y = padding.top + usableHeight * ratio;
            return <g key={ratio}><line x1={padding.left} y1={y} x2={width - padding.right} y2={y} className="stroke-outline-variant" strokeWidth="1" /><text x="4" y={y + 4} className="fill-outline text-[10px]">{formatNumber(Math.round(maxValue * (1 - ratio)))}</text></g>;
          })}
          {series.map(item => <polyline key={item.key} points={timeline.map((entry, index) => point(entry[item.key], index)).join(' ')} fill="none" className={item.className} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
          {timeline.map((entry, index) => {
            const x = padding.left + (timeline.length <= 1 ? usableWidth / 2 : index * usableWidth / (timeline.length - 1));
            const show = timeline.length <= 12 || index % 2 === 0 || index === timeline.length - 1;
            return show ? <text key={entry.month} x={x} y={height - 9} textAnchor="middle" className="fill-outline text-[10px]">{monthFormatter.format(new Date(`${entry.month}-01T00:00:00`))}</text> : null;
          })}
        </svg>
      </div>
    </div>
  );
}

function Funnel({ data }) {
  const rows = [
    ['Просмотры вакансий', data.views], ['Отклики', data.applications],
    ['На рассмотрении', data.reviewing], ['Наняты', data.hires],
  ];
  const max = Math.max(1, ...rows.map(row => row[1]));
  return <div className="space-y-4">{rows.map(([label, value]) => <div key={label}><div className="flex justify-between gap-4 text-xs mb-1.5"><span className="text-on-surface-variant">{label}</span><span className="font-semibold text-on-surface">{formatNumber(value)}</span></div><div className="h-2.5 bg-surface-container-high rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(value ? 5 : 0, value / max * 100)}%` }} /></div></div>)}</div>;
}

function BarRows({ items, valueKey, emptyText }) {
  const max = Math.max(1, ...items.map(item => Number(item[valueKey]) || 0));
  if (!items.length) return <p className="text-sm text-outline">{emptyText}</p>;
  return <div className="space-y-4">{items.map(item => <div key={item.name}><div className="flex justify-between gap-3 text-sm mb-1.5"><span className="text-on-surface truncate">{item.name}</span><span className="text-on-surface-variant flex-shrink-0">{formatNumber(item[valueKey])}</span></div><div className="h-2 bg-surface-container-high rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${item[valueKey] / max * 100}%` }} /></div></div>)}</div>;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { user, isCompany } = useAuth();
  const [months, setMonths] = useState(12);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.platformAnalytics(months).then(data => { if (active) setAnalytics(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [months]);

  const insight = useMemo(() => {
    if (!analytics) return null;
    const deficit = analytics.skills.filter(item => item.gap < 0).sort((a, b) => a.gap - b.gap)[0];
    const topSpecialization = analytics.specializations[0];
    return { deficit, topSpecialization };
  }, [analytics]);

  const homeRoute = user ? (isCompany ? '/vacancies' : '/vacancies-public') : '/';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-background/90 backdrop-blur-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button className="flex items-center gap-2.5" onClick={() => navigate(homeRoute)}><span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center"><Sparkles className="w-4 h-4" /></span><span className="font-bold text-on-surface">CareerHub</span></button>
          <div className="flex items-center gap-2"><button className="btn-ghost hidden sm:inline-flex" onClick={() => navigate(homeRoute)}><ArrowLeft className="w-4 h-4" /> Вернуться</button>{!user && <button className="btn-secondary" onClick={() => navigate('/login')}>Войти</button>}</div>
        </div>
      </header>

      <section className="border-b border-outline-variant/60 bg-surface-container/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col lg:flex-row lg:items-end justify-between gap-7">
          <div className="max-w-3xl"><p className="section-label mb-3">Открытая статистика CareerHub</p><h1 className="text-3xl sm:text-5xl font-bold text-on-surface tracking-tight">Рынок начинающих IT-специалистов</h1><p className="text-on-surface-variant mt-4 leading-relaxed">Динамика вакансий, кандидатов, откликов и навыков на основе обезличенных данных платформы.</p></div>
          <label className="text-xs text-on-surface-variant"><span className="block mb-2">Период</span><select value={months} onChange={event => setMonths(Number(event.target.value))} className="input-field min-w-44"><option value={6}>Последние 6 месяцев</option><option value={12}>Последний год</option><option value={24}>Последние 2 года</option></select></label>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {error && <div className="alert-error mb-6">{error}</div>}
        {loading ? <LoadingState count={6} /> : analytics && <>
          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <MetricCard label="Активные вакансии" value={analytics.summary.active_vacancies} growth={analytics.summary.vacancy_growth} icon={<BriefcaseBusiness className="w-5 h-5" />} />
            <MetricCard label="Кандидаты" value={analytics.summary.candidates} growth={analytics.summary.candidate_growth} icon={<UsersRound className="w-5 h-5" />} />
            <MetricCard label="Отклики" value={analytics.summary.applications} growth={analytics.summary.application_growth} icon={<UserRound className="w-5 h-5" />} />
            <MetricCard label="Успешные наймы" value={analytics.summary.hires} icon={<CheckCircle2 className="w-5 h-5" />} note="За всё время работы платформы" />
          </section>

          <section className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,.75fr)] gap-5 mb-6">
            <article className="glass-card p-5 sm:p-6"><div className="mb-5"><p className="section-label mb-2">Динамика</p><h2 className="text-xl font-semibold text-on-surface">Вакансии, кандидаты и отклики</h2></div><TrendChart timeline={analytics.timeline} /></article>
            <article className="glass-card p-5 sm:p-6"><div className="mb-6"><p className="section-label mb-2">Конверсия</p><h2 className="text-xl font-semibold text-on-surface">Воронка найма</h2></div><Funnel data={analytics.funnel} /></article>
          </section>

          <section className="grid lg:grid-cols-2 gap-5 mb-6">
            <article className="glass-card p-5 sm:p-6"><div className="mb-6"><p className="section-label mb-2">Структура рынка</p><h2 className="text-xl font-semibold text-on-surface">Вакансии по специализациям</h2></div><BarRows items={analytics.specializations} valueKey="vacancies" emptyText="Недостаточно вакансий для распределения." /></article>
            <article className="glass-card p-5 sm:p-6"><div className="mb-6"><p className="section-label mb-2">География</p><h2 className="text-xl font-semibold text-on-surface">Города по количеству вакансий</h2></div><BarRows items={analytics.cities} valueKey="vacancies" emptyText="В вакансиях пока не указаны города." /></article>
          </section>

          <section className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)] gap-5">
            <article className="glass-card p-5 sm:p-6 overflow-hidden"><div className="mb-5"><p className="section-label mb-2">Навыки</p><h2 className="text-xl font-semibold text-on-surface">Спрос и предложение</h2></div>{analytics.skills.length ? <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="text-left text-xs text-outline border-b border-outline-variant"><th className="pb-3 font-medium">Навык</th><th className="pb-3 text-right font-medium">В вакансиях</th><th className="pb-3 text-right font-medium">У кандидатов</th><th className="pb-3 text-right font-medium">Баланс</th></tr></thead><tbody>{analytics.skills.map(item => <tr key={item.name} className="border-b border-outline-variant/60 last:border-0"><td className="py-3.5 text-on-surface font-medium">{item.name}</td><td className="py-3.5 text-right text-on-surface-variant">{formatNumber(item.demand)}</td><td className="py-3.5 text-right text-on-surface-variant">{formatNumber(item.supply)}</td><td className={`py-3.5 text-right font-medium ${item.gap < 0 ? 'text-error' : 'text-tertiary'}`}>{item.gap > 0 ? '+' : ''}{item.gap}</td></tr>)}</tbody></table></div> : <p className="text-sm text-outline">Навыки появятся после заполнения вакансий и профилей.</p>}</article>
            <aside className="glass-card p-5 sm:p-6"><div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-5"><BarChart3 className="w-5 h-5" /></div><h2 className="text-xl font-semibold text-on-surface mb-5">Что видно из данных</h2><div className="space-y-5">{insight?.deficit && <div><p className="text-sm font-medium text-on-surface">Дефицит: {insight.deficit.name}</p><p className="text-xs text-on-surface-variant mt-1">Спрос превышает предложение на {Math.abs(insight.deficit.gap)} профилей.</p></div>}{insight?.topSpecialization && <div><p className="text-sm font-medium text-on-surface">Лидер: {insight.topSpecialization.name}</p><p className="text-xs text-on-surface-variant mt-1">{formatNumber(insight.topSpecialization.vacancies)} активных вакансий и {formatNumber(insight.topSpecialization.candidates)} кандидатов.</p></div>}{analytics.cities[0] && <div><p className="text-sm font-medium text-on-surface flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{analytics.cities[0].name}</p><p className="text-xs text-on-surface-variant mt-1">Город с наибольшим количеством активных вакансий.</p></div>}</div></aside>
          </section>

          <p className="text-xs text-outline mt-8 text-center">Показатели формируются из агрегированных данных CareerHub. Персональные данные пользователей не публикуются.</p>
        </>}
      </main>
    </div>
  );
}
