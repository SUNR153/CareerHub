from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView, LoginView, MeView, MeResumeView,
    VacancyViewSet, CompanyListView, CandidateListView,
    AllVacanciesView, VacancyDetailView, VacancyApplicationView, VacancyApplicationsView, CompanyProfileView, CandidateProfileView, CandidateContactsView, CompanyHiringStatsView, GenerateResumeSummaryView, MyApplicationsView, NotificationListView, NotificationReadView, CandidateInviteView, PythonTestView, PlatformAnalyticsView,
)

router = DefaultRouter()
router.register(r'my-vacancies', VacancyViewSet, basename='my-vacancies')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('me/resume/', MeResumeView.as_view(), name='my_resume'),
    path('me/generate-summary/', GenerateResumeSummaryView.as_view(), name='generate_resume_summary'),
    path('companies/', CompanyListView.as_view(), name='companies'),
    path('companies/<int:pk>/', CompanyProfileView.as_view(), name='company_profile'),
    path('candidates/', CandidateListView.as_view(), name='candidates'),
    path('candidates/<int:pk>/', CandidateProfileView.as_view(), name='candidate_profile'),
    path('candidates/<int:pk>/contacts/', CandidateContactsView.as_view(), name='candidate_contacts'),
    path('vacancies/', AllVacanciesView.as_view(), name='all_vacancies'),
    path('vacancies/<int:pk>/', VacancyDetailView.as_view(), name='vacancy_detail'),
    path('vacancies/<int:pk>/apply/', VacancyApplicationView.as_view(), name='vacancy_apply'),
    path('my-applications/', MyApplicationsView.as_view(), name='my_applications'),
    path('notifications/', NotificationListView.as_view(), name='notifications'),
    path('notifications/read/', NotificationReadView.as_view(), name='notifications_read'),
    path('candidates/<int:pk>/invite/', CandidateInviteView.as_view(), name='candidate_invite'),
    path('tests/python/', PythonTestView.as_view(), name='python_test'),
    path('my-vacancies/<int:pk>/applications/', VacancyApplicationsView.as_view(), name='vacancy_applications'),
    path('company-hiring-stats/', CompanyHiringStatsView.as_view(), name='company_hiring_stats'),
    path('analytics/', PlatformAnalyticsView.as_view(), name='platform_analytics'),
    path('', include(router.urls)),
]
