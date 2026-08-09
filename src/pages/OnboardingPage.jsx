import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, GraduationCap, MapPin, Search, Sparkles, UserRound } from 'lucide-react';

const directions = ['Frontend-разработчик', 'Python-разработчик', 'Data Analyst', 'UI/UX дизайнер', 'QA Engineer', 'DevOps'];

const roleCards = [
  { id: 'student', icon: <GraduationCap className="w-5 h-5" />, title: 'Я студент', text: 'Первая работа, практика и стажировки по вашим навыкам.', action: 'Создать профиль', route: '/register/student' },
  { id: 'jobseeker', icon: <UserRound className="w-5 h-5" />, title: 'Ищу работу', text: 'Вакансии, отклики и подтверждение профессиональных навыков.', action: 'Создать резюме', route: '/register/jobseeker' },
  { id: 'company', icon: <Building2 className="w-5 h-5" />, title: 'Ищу сотрудника', text: 'Публикация вакансий и доступ к подходящим кандидатам.', action: 'Кабинет компании', route: '/register/company' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');

  const startSearch = (event) => {
    event.preventDefault();
    navigate('/login', { state: { role: 'jobseeker', search: query.trim(), city: city.trim() } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-background/90 backdrop-blur-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button className="flex items-center gap-2.5" onClick={() => navigate('/')}>
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white"><Sparkles className="w-4 h-4" /></span>
            <span className="font-bold text-lg tracking-tight text-on-surface">CareerHub</span>
          </button>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <button className="nav-link" onClick={() => navigate('/login', { state: { role: 'jobseeker' } })}>Вакансии</button>
            <button className="nav-link" onClick={() => navigate('/login', { state: { role: 'company' } })}>Кандидаты</button>
            <button className="nav-link" onClick={() => navigate('/analytics')}>Аналитика</button>
          </nav>
          <div className="flex items-center gap-2">
            <button className="btn-ghost hidden sm:inline-flex" onClick={() => navigate('/register/company')}>Работодателям</button>
            <button id="signin-link" className="btn-secondary py-2" onClick={() => navigate('/login')}>Войти</button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-outline-variant/60">
          <div className="absolute inset-0 bg-grid opacity-80" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 mb-6">
                <Sparkles className="w-3.5 h-3.5" /> Карьера начинается с точного совпадения
              </div>
              <h1 className="text-4xl sm:text-6xl font-bold text-on-surface tracking-tight leading-[1.08] max-w-3xl">Работа, которая подходит именно вам</h1>
              <p className="text-lg text-on-surface-variant mt-5 max-w-2xl">Ищите вакансии и практику, подтверждайте навыки и общайтесь с компаниями в одном месте.</p>

              <form onSubmit={startSearch} className="mt-10 bg-surface border border-outline-variant rounded-2xl p-2 shadow-glass-lg flex flex-col md:flex-row gap-2 max-w-5xl">
                <label className="flex items-center gap-3 flex-1 px-4 h-14 bg-surface-container rounded-xl">
                  <Search className="w-5 h-5 text-outline" />
                  <input value={query} onChange={event => setQuery(event.target.value)} className="bg-transparent outline-none text-on-surface placeholder:text-outline w-full text-sm" placeholder="Должность, навык или компания" />
                </label>
                <label className="flex items-center gap-3 md:w-64 px-4 h-14 bg-surface-container rounded-xl">
                  <MapPin className="w-5 h-5 text-outline" />
                  <input value={city} onChange={event => setCity(event.target.value)} className="bg-transparent outline-none text-on-surface placeholder:text-outline w-full text-sm" placeholder="Город" />
                </label>
                <button className="btn-primary h-14 px-8 rounded-xl">Найти вакансии</button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-outline mr-1">Популярное:</span>
                {directions.map(item => <button key={item} onClick={() => setQuery(item)} className="text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant hover:border-outline rounded-full px-3 py-1.5 transition-colors">{item}</button>)}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-end justify-between gap-4 mb-7">
            <div><p className="section-label mb-2">Начните с роли</p><h2 className="text-2xl sm:text-3xl font-bold text-on-surface">Что вы хотите сделать?</h2></div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {roleCards.map(({ id, icon, title, text, action, route }) => (
              <button key={id} id={`path-${id}`} onClick={() => navigate(route)} className="glass-card card-hover p-6 text-left group">
                <div className="flex items-start justify-between gap-4">
                  <span className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">{icon}</span>
                  <ArrowRight className="w-5 h-5 text-outline group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-lg font-semibold text-on-surface mt-6">{title}</h3>
                <p className="text-sm text-on-surface-variant mt-2 min-h-10">{text}</p>
                <span className="inline-flex mt-5 text-sm font-medium text-primary">{action}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="border-y border-outline-variant/60 bg-surface-container/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
            <div>
              <span className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mb-5"><BriefcaseBusiness className="w-6 h-6" /></span>
              <h2 className="text-3xl font-bold text-on-surface">Профиль сильнее обычного резюме</h2>
              <p className="text-on-surface-variant mt-4 leading-relaxed">Работодатель видит специализацию, подтверждённые навыки, проекты и результаты тестов — только те данные, которыми вы разрешили делиться.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {['Подходящие вакансии по навыкам', 'Практика и стартовые позиции', 'Уведомления о статусе отклика', 'Приватность контактных данных'].map(item => (
                <div key={item} className="glass-card p-4 flex items-center gap-3 text-sm text-on-surface"><CheckCircle2 className="w-5 h-5 text-tertiary flex-shrink-0" />{item}</div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row gap-3 justify-between text-xs text-outline">
        <span>© 2026 CareerHub · IITU</span><span>Платформа для студентов, соискателей и работодателей</span>
      </footer>
    </div>
  );
}
