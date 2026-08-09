import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Building2, Clock, ExternalLink } from 'lucide-react';
import AppNavbar from '../components/AppNavbar';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PageHeader from '../components/ui/PageHeader';
import { api } from '../api/client';

const STATUS_STYLES = {
  pending: 'badge badge-outline',
  reviewing: 'badge badge-indigo',
  rejected: 'badge bg-error/10 text-error border border-error/20',
  hired: 'badge badge-green',
};

export default function MyApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [applicationData, notificationData] = await Promise.all([
        api.myApplications(),
        api.notifications(),
      ]);
      setApplications(applicationData);
      setNotifications(notificationData);
      setError('');
      if (notificationData.some(item => !item.is_read)) {
        await api.markNotificationsRead();
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <PageHeader
          icon={Briefcase}
          eyebrow="Поиск работы"
          title="Мои отклики"
          subtitle="Здесь отображаются все ваши отклики и ответы компаний. Страница обновляется автоматически."
        />

        {error && <div className="alert-error text-sm my-6">{error}</div>}

        {notifications.length > 0 && (
          <section className="glass-card p-6 mt-8 mb-6">
            <h2 className="font-semibold text-on-surface flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-primary" /> Последние уведомления
            </h2>
            <div className="space-y-3">
              {notifications.slice(0, 5).map(notification => (
                <div key={notification.id} className={`rounded-xl border p-4 ${notification.is_read ? 'border-outline-variant bg-surface-container' : 'border-primary/30 bg-primary/5'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{notification.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{notification.message}</p>
                    </div>
                    <span className="text-[10px] text-outline whitespace-nowrap">{new Date(notification.created_at).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="mt-8"><LoadingState text="Загрузка откликов..." /></div>
        ) : applications.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Briefcase}
              title="Вы ещё не откликались"
              description="Выберите подходящую вакансию и отправьте первый отклик."
              action={{ label: 'Найти вакансии', onClick: () => navigate('/vacancies-public') }}
            />
          </div>
        ) : (
          <section className="grid gap-4 mt-8">
            {applications.map(application => {
              const vacancy = application.vacancy;
              return (
                <article key={application.id} className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="font-semibold text-on-surface">{vacancy.title}</h2>
                      <span className={STATUS_STYLES[application.status] || STATUS_STYLES.pending}>{application.status_label}</span>
                    </div>
                    <p className="text-sm text-on-surface-variant flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{vacancy.company?.name || 'Компания'}</p>
                    <p className="text-xs text-outline flex items-center gap-1.5 mt-2"><Clock className="w-3.5 h-3.5" />Отклик: {new Date(application.created_at).toLocaleString('ru-RU')} · Обновлён: {new Date(application.updated_at).toLocaleString('ru-RU')}</p>
                  </div>
                  <button type="button" onClick={() => navigate(`/vacancies/${vacancy.id}`)} className="btn-secondary text-xs flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" /> Открыть вакансию
                  </button>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}
