from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from django.http import HttpResponse
from io import BytesIO
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether
import os
import requests
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Count
from django.db.models.functions import TruncMonth
from django.utils import timezone
from collections import Counter
from datetime import datetime
from .models import User, Vacancy, VacancyView, Application, Notification
from .serializers import UserSerializer, RegisterSerializer, VacancySerializer, VacancyWithCompanySerializer, PublicCandidateSerializer, PublicCompanySerializer, CandidateContactsSerializer, ApplicationSerializer, CandidateApplicationSerializer, NotificationSerializer

PYTHON_TEST_QUESTIONS = (
    {'id': 1, 'question': 'Какой тип данных Python является изменяемым?', 'options': [{'id': 'A', 'text': 'tuple'}, {'id': 'B', 'text': 'list'}, {'id': 'C', 'text': 'str'}, {'id': 'D', 'text': 'frozenset'}], 'correct': 'B'},
    {'id': 2, 'question': 'Что вернёт выражение {"a": 1}.get("b", 0)?', 'options': [{'id': 'A', 'text': 'None'}, {'id': 'B', 'text': 'KeyError'}, {'id': 'C', 'text': '0'}, {'id': 'D', 'text': 'False'}], 'correct': 'C'},
    {'id': 3, 'question': 'Какая конструкция гарантированно закрывает открытый файл?', 'options': [{'id': 'A', 'text': 'with open(...) as file'}, {'id': 'B', 'text': 'open(...)'}, {'id': 'C', 'text': 'try без finally'}, {'id': 'D', 'text': 'input(...)'}], 'correct': 'A'},
    {'id': 4, 'question': 'Как создать виртуальное окружение Python?', 'options': [{'id': 'A', 'text': 'python -m pip env'}, {'id': 'B', 'text': 'python -m venv .venv'}, {'id': 'C', 'text': 'python --virtual'}, {'id': 'D', 'text': 'pip create venv'}], 'correct': 'B'},
    {'id': 5, 'question': 'Какое исключение возникает при обращении к отсутствующему ключу словаря через []?', 'options': [{'id': 'A', 'text': 'ValueError'}, {'id': 'B', 'text': 'IndexError'}, {'id': 'C', 'text': 'KeyError'}, {'id': 'D', 'text': 'TypeError'}], 'correct': 'C'},
)


class GenerateResumeSummaryView(APIView):
    """Generate a grounded summary through the private NLP service."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role == 'company':
            return Response({'detail': 'Генерация доступна только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)

        target_role = str(request.data.get('targetRole') or user.specialization or '').strip()
        if not target_role:
            return Response({'detail': 'Сначала укажите желаемую должность.'}, status=status.HTTP_400_BAD_REQUEST)

        projects = []
        for project in user.projects or []:
            name = str(project.get('name', '')).strip()
            description = str(project.get('desc') or project.get('description') or '').strip()
            if name and description:
                projects.append({'name': name, 'description': description})

        payload = {
            'educationYear': user.education_info or user.university or 'Образование не указано',
            'specialization': user.specialization or target_role,
            'targetRole': target_role,
            'skills': user.skills or [],
            'projects': projects,
            'personalTraits': [],
            'language': request.data.get('language', 'ru'),
        }
        headers = {}
        service_token = os.getenv('NLP_SERVICE_TOKEN')
        if service_token:
            headers['X-Service-Token'] = service_token

        try:
            response = requests.post(
                f"{os.getenv('NLP_SERVICE_URL', 'http://127.0.0.1:8001').rstrip('/')}/generate-summary",
                json=payload,
                headers=headers,
                timeout=45,
            )
            response.raise_for_status()
            result = response.json()
        except (requests.RequestException, ValueError):
            return Response(
                {'detail': 'Сервис генерации резюме временно недоступен.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'text': result.get('text', '')})

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'email' in data and 'username' not in data:
            data['username'] = data['email'].split('@')[0]
            
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        refresh = RefreshToken.for_user(user)
        return Response({
            "user": UserSerializer(user, context=self.get_serializer_context()).data,
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)

class LoginView(generics.GenericAPIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, *args, **kwargs):
        email = str(request.data.get("email") or "").strip()
        password = request.data.get("password") or ""

        if not email or not password:
            return Response({"error": "Введите email и пароль."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email)
            if user.is_active and user.check_password(password):
                refresh = RefreshToken.for_user(user)
                return Response({
                    "user": UserSerializer(user).data,
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                })
        except User.DoesNotExist:
            pass
            
        return Response({"error": "Неверный email или пароль."}, status=status.HTTP_401_UNAUTHORIZED)

class MeView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def destroy(self, request, *args, **kwargs):
        if request.user.role == 'company':
            return Response(
                {'detail': 'Удаление аккаунта компании отключено.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class MeResumeView(APIView):
    """Generate a candidate's own resume as a PDF without exposing private data to companies."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'company':
            return Response({'detail': 'Резюме доступно только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)

        buffer = BytesIO()
        font_path = os.path.join(os.environ.get('WINDIR', r'C:\\Windows'), 'Fonts', 'arial.ttf')
        font_name = 'Helvetica'
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont('CareerHubArial', font_path))
            font_name = 'CareerHubArial'

        styles = getSampleStyleSheet()
        title = ParagraphStyle('ResumeTitle', parent=styles['Title'], fontName=font_name, fontSize=22, leading=27, textColor=colors.HexColor('#111827'), spaceAfter=4)
        subtitle = ParagraphStyle('ResumeSubtitle', parent=styles['Normal'], fontName=font_name, fontSize=10, leading=15, textColor=colors.HexColor('#4B5563'), spaceAfter=14)
        heading = ParagraphStyle('ResumeHeading', parent=styles['Heading2'], fontName=font_name, fontSize=13, leading=17, textColor=colors.HexColor('#1D4ED8'), spaceBefore=10, spaceAfter=6)
        body = ParagraphStyle('ResumeBody', parent=styles['BodyText'], fontName=font_name, fontSize=10, leading=14, textColor=colors.HexColor('#1F2937'), spaceAfter=5)
        muted = ParagraphStyle('ResumeMuted', parent=body, textColor=colors.HexColor('#6B7280'))

        story = []
        name = escape(f'{user.first_name} {user.last_name}'.strip() or user.username)
        story.append(Paragraph(name, title))
        meta = ' · '.join(filter(None, [user.specialization, user.city, user.university]))
        if meta:
            story.append(Paragraph(escape(meta), subtitle))
        if user.about:
            story.extend([Paragraph('О себе', heading), Paragraph(escape(user.about).replace('\n', '<br/>'), body)])
        if user.skills:
            story.extend([Paragraph('Навыки', heading), Paragraph(escape(', '.join(user.skills)), body)])
        if user.experience:
            story.append(Paragraph('Опыт работы', heading))
            for item in user.experience:
                period = item.get('start_date', '')
                if item.get('is_current'):
                    period += ' - по настоящее время'
                elif item.get('end_date'):
                    period += f" - {item['end_date']}"
                content = f"<b>{escape(item.get('role', ''))}</b> — {escape(item.get('company', ''))}<br/><font color='#6B7280'>{escape(period)}</font>"
                if item.get('desc'):
                    content += f"<br/>{escape(item['desc'])}"
                story.append(KeepTogether(Paragraph(content, body)))
        if user.projects:
            story.append(Paragraph('Проекты', heading))
            for item in user.projects:
                content = f"<b>{escape(item.get('name', ''))}</b><br/>{escape(item.get('desc', ''))}"
                if item.get('tech'):
                    content += f"<br/><font color='#6B7280'>{escape(', '.join(item['tech']))}</font>"
                story.append(KeepTogether(Paragraph(content, body)))
        if user.test_results:
            story.append(Paragraph('Результаты тестов', heading))
            for item in user.test_results:
                story.append(Paragraph(escape(f"{item.get('tech', '')}: {item.get('level', '')}, {item.get('score', '')}%"), muted))

        document = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm, title='CareerHub Resume')
        document.build(story)
        filename = 'careerhub-resume.pdf'
        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    def delete(self, request):
        user = request.user
        if not user.resume_file:
            return Response(status=status.HTTP_204_NO_CONTENT)
        user.resume_file.delete(save=False)
        user.resume_file = None
        user.save(update_fields=['resume_file'])
        return Response(status=status.HTTP_204_NO_CONTENT)

class VacancyViewSet(viewsets.ModelViewSet):
    serializer_class = VacancySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Vacancy.objects.filter(company=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user)

class CompanyListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return User.objects.filter(role='company')

class CandidateListView(generics.ListAPIView):
    serializer_class = PublicCandidateSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.role != 'company':
            return User.objects.none()
        queryset = User.objects.filter(role__in=['student', 'jobseeker'])
        skills = self.request.query_params.getlist('skill')
        if skills:
            for skill in skills:
                queryset = queryset.filter(skills__contains=[skill])
        return queryset

class AllVacanciesView(generics.ListAPIView):
    """All vacancies from all companies — visible to students/jobseekers."""
    serializer_class = VacancyWithCompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role == 'company':
            return Vacancy.objects.none()
        return Vacancy.objects.filter(is_active=True).select_related('company').order_by('-created_at')


class VacancyDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        vacancy = get_object_or_404(Vacancy.objects.select_related('company'), pk=pk, is_active=True)
        if request.user.role in ('student', 'jobseeker'):
            VacancyView.objects.get_or_create(vacancy=vacancy, viewer=request.user)
        return Response(VacancyWithCompanySerializer(vacancy).data)


class VacancyApplicationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role not in ('student', 'jobseeker'):
            return Response({'detail': 'Отклик доступен только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)
        vacancy = get_object_or_404(Vacancy, pk=pk, is_active=True)
        application, created = Application.objects.get_or_create(vacancy=vacancy, candidate=request.user)
        if not created:
            return Response({'detail': 'Вы уже откликнулись на эту вакансию.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class MyApplicationsView(generics.ListAPIView):
    serializer_class = CandidateApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role not in ('student', 'jobseeker'):
            return Application.objects.none()
        return Application.objects.filter(candidate=self.request.user).select_related('vacancy', 'vacancy__company').order_by('-updated_at')


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role not in ('student', 'jobseeker'):
            return Notification.objects.none()
        return Notification.objects.filter(recipient=self.request.user).select_related('application')[:100]


class NotificationReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        if request.user.role not in ('student', 'jobseeker'):
            return Response({'detail': 'Доступно только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)
        notifications = Notification.objects.filter(recipient=request.user, is_read=False)
        notification_id = request.data.get('notification_id')
        if notification_id is not None:
            notifications = notifications.filter(pk=notification_id)
        updated = notifications.update(is_read=True)
        return Response({'updated': updated})


class CandidateInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'company':
            return Response({'detail': 'Доступно только компаниям.'}, status=status.HTTP_403_FORBIDDEN)
        candidate = get_object_or_404(User, pk=pk, role__in=['student', 'jobseeker'])
        company_name = request.user.get_full_name() or request.user.username or request.user.email
        title = 'Приглашение на собеседование'
        message = f'Компания {company_name} приглашает вас обсудить подходящие вакансии.'
        notification, created = Notification.objects.get_or_create(
            recipient=candidate, application=None, title=title,
            defaults={'message': message},
        )
        return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class PythonTestView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('student', 'jobseeker'):
            return Response({'detail': 'Доступно только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)
        questions = [{key: value for key, value in question.items() if key != 'correct'} for question in PYTHON_TEST_QUESTIONS]
        return Response({'questions': questions, 'duration_seconds': 600, 'pass_score': 70})

    def post(self, request):
        if request.user.role not in ('student', 'jobseeker'):
            return Response({'detail': 'Доступно только кандидатам.'}, status=status.HTTP_403_FORBIDDEN)
        answers = request.data.get('answers') or {}
        correct = sum(str(answers.get(str(question['id']), answers.get(question['id'], ''))).upper() == question['correct'] for question in PYTHON_TEST_QUESTIONS)
        total = len(PYTHON_TEST_QUESTIONS)
        score = round(correct * 100 / total)
        result = {'tech': 'Python', 'level': 'Junior', 'score': score, 'passed': score >= 70, 'correct': correct, 'total': total}
        history = list(request.user.test_results or [])
        history.append(result)
        request.user.test_results = history[-20:]
        request.user.save(update_fields=['test_results'])
        return Response(result)


class VacancyApplicationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        vacancy = get_object_or_404(Vacancy, pk=pk, company=request.user)
        return Response(ApplicationSerializer(vacancy.applications.select_related('candidate').order_by('-created_at'), many=True).data)

    def patch(self, request, pk):
        vacancy = get_object_or_404(Vacancy, pk=pk, company=request.user)
        application = get_object_or_404(Application, pk=request.data.get('application_id'), vacancy=vacancy)
        status_value = request.data.get('status')
        if status_value not in dict(Application.STATUS_CHOICES):
            return Response({'detail': 'Некорректный статус отклика.'}, status=status.HTTP_400_BAD_REQUEST)
        if application.status == status_value:
            return Response(ApplicationSerializer(application).data)

        status_label = dict(Application.STATUS_CHOICES)[status_value]
        with transaction.atomic():
            application.status = status_value
            application.save(update_fields=['status', 'updated_at'])
            Notification.objects.create(
                recipient=application.candidate,
                application=application,
                title=f'Статус отклика: {status_label}',
                message=f'Компания {vacancy.company.get_full_name() or vacancy.company.username} изменила статус вашего отклика на вакансию «{vacancy.title}» на «{status_label}».',
            )
        return Response(ApplicationSerializer(application).data)

class CompanyProfileView(APIView):
    """Returns public profile of a specific company."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        company = get_object_or_404(User, pk=pk, role='company')
        vacancies = Vacancy.objects.filter(company=company, is_active=True).order_by('-created_at')
        return Response({
            "company": PublicCompanySerializer(company).data,
            "vacancies": VacancySerializer(vacancies, many=True).data,
        })

class CandidateProfileView(generics.RetrieveAPIView):
    """Returns only the candidate fields that companies may use in recruitment."""
    serializer_class = PublicCandidateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.role != 'company':
            return User.objects.none()
        return User.objects.filter(role__in=['student', 'jobseeker'])


class CandidateContactsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'company':
            return Response({'detail': 'Доступно только компаниям.'}, status=status.HTTP_403_FORBIDDEN)
        candidate = get_object_or_404(User, pk=pk, role__in=['student', 'jobseeker'])
        if not candidate.contact_sharing_enabled:
            return Response({'detail': 'Кандидат пока не открыл контакты компаниям.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(CandidateContactsSerializer(candidate).data)


class CompanyHiringStatsView(APIView):
    """Premium hiring analytics endpoint."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != 'company':
            return Response({'detail': 'Доступно только компаниям.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(
            {'detail': 'Статистика найма доступна в платном тарифе для компаний.'},
            status=status.HTTP_402_PAYMENT_REQUIRED,
        )


ANALYTICS_SPECIALIZATIONS = (
    ('Frontend', ('frontend', 'react', 'vue', 'angular', 'javascript', 'typescript')),
    ('Backend', ('backend', 'node.js', 'nodejs', '.net', 'php', 'golang', 'go developer')),
    ('Python', ('python', 'django', 'fastapi')),
    ('Java', ('java', 'spring', 'kotlin')),
    ('Data & AI', ('data', 'machine learning', 'ml', 'ai', 'аналитик данных')),
    ('QA', ('qa', 'тестировщик', 'testing', 'quality assurance')),
    ('DevOps', ('devops', 'docker', 'kubernetes', 'cloud', 'sre')),
    ('Mobile', ('android', 'ios', 'mobile', 'flutter', 'react native')),
    ('UI/UX', ('ui/ux', 'ux', 'ui designer', 'product designer', 'дизайнер')),
)


def _analytics_specialization(text):
    normalized = str(text or '').lower()
    for label, keywords in ANALYTICS_SPECIALIZATIONS:
        if any(keyword in normalized for keyword in keywords):
            return label
    return 'Другое'


def _analytics_months(month_count):
    today = timezone.localdate()
    current = today.replace(day=1)
    result = []
    for offset in range(month_count - 1, -1, -1):
        year = current.year
        month = current.month - offset
        while month <= 0:
            year -= 1
            month += 12
        result.append(datetime(year, month, 1).date())
    return result


def _analytics_growth(current, previous):
    if previous == 0:
        return 100 if current > 0 else 0
    return round((current - previous) * 100 / previous)


class PlatformAnalyticsView(APIView):
    """Public, aggregate-only analytics built from CareerHub data."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        try:
            month_count = int(request.query_params.get('months', 12))
        except (TypeError, ValueError):
            month_count = 12
        month_count = month_count if month_count in (6, 12, 24) else 12
        months = _analytics_months(month_count)
        period_start = months[0]
        current_month = months[-1]
        previous_month = _analytics_months(2)[0]

        candidates = User.objects.filter(role__in=('student', 'jobseeker'))
        active_vacancies = Vacancy.objects.filter(is_active=True)
        applications = Application.objects.all()

        def monthly_counts(queryset, date_field):
            rows = queryset.filter(**{f'{date_field}__date__gte': period_start}).annotate(
                month=TruncMonth(date_field)
            ).values('month').annotate(total=Count('id')).order_by('month')
            return {row['month'].date().isoformat()[:7]: row['total'] for row in rows}

        vacancy_months = monthly_counts(Vacancy.objects.all(), 'created_at')
        candidate_months = monthly_counts(candidates, 'date_joined')
        application_months = monthly_counts(applications, 'created_at')
        hire_months = monthly_counts(applications.filter(status='hired'), 'updated_at')

        timeline = []
        for month in months:
            key = month.isoformat()[:7]
            timeline.append({
                'month': key,
                'vacancies': vacancy_months.get(key, 0),
                'candidates': candidate_months.get(key, 0),
                'applications': application_months.get(key, 0),
                'hires': hire_months.get(key, 0),
            })

        current_key = current_month.isoformat()[:7]
        previous_key = previous_month.isoformat()[:7]
        vacancy_specializations = Counter()
        skill_demand = Counter()
        city_counts = Counter()
        for vacancy in active_vacancies.only('title', 'department', 'requirements', 'location'):
            searchable = ' '.join([vacancy.title or '', vacancy.department or '', ' '.join(vacancy.requirements or [])])
            vacancy_specializations[_analytics_specialization(searchable)] += 1
            if vacancy.location:
                city_counts[vacancy.location.strip()] += 1
            for requirement in vacancy.requirements or []:
                skill = str(requirement).strip()
                if skill and len(skill) <= 40:
                    skill_demand[skill.casefold()] += 1

        candidate_specializations = Counter()
        skill_supply = Counter()
        for candidate in candidates.only('specialization', 'skills'):
            searchable = ' '.join([candidate.specialization or '', ' '.join(candidate.skills or [])])
            candidate_specializations[_analytics_specialization(searchable)] += 1
            for candidate_skill in candidate.skills or []:
                skill = str(candidate_skill).strip()
                if skill and len(skill) <= 40:
                    skill_supply[skill.casefold()] += 1

        specialization_names = set(vacancy_specializations) | set(candidate_specializations)
        specializations = []
        for name in specialization_names:
            vacancy_count = vacancy_specializations[name]
            candidate_count = candidate_specializations[name]
            specializations.append({
                'name': name,
                'vacancies': vacancy_count,
                'candidates': candidate_count,
                'competition_index': round(candidate_count / vacancy_count, 1) if vacancy_count else None,
            })
        specializations.sort(key=lambda item: (item['vacancies'], item['candidates']), reverse=True)

        skill_names = set(skill_demand) | set(skill_supply)
        skills = [{
            'name': skill.title(),
            'demand': skill_demand[skill],
            'supply': skill_supply[skill],
            'gap': skill_supply[skill] - skill_demand[skill],
        } for skill in skill_names]
        skills.sort(key=lambda item: (item['demand'], abs(item['gap'])), reverse=True)

        return Response({
            'period_months': month_count,
            'generated_at': timezone.now().isoformat(),
            'summary': {
                'active_vacancies': active_vacancies.count(),
                'candidates': candidates.count(),
                'applications': applications.count(),
                'hires': applications.filter(status='hired').count(),
                'vacancy_growth': _analytics_growth(vacancy_months.get(current_key, 0), vacancy_months.get(previous_key, 0)),
                'candidate_growth': _analytics_growth(candidate_months.get(current_key, 0), candidate_months.get(previous_key, 0)),
                'application_growth': _analytics_growth(application_months.get(current_key, 0), application_months.get(previous_key, 0)),
            },
            'timeline': timeline,
            'funnel': {
                'views': VacancyView.objects.count(),
                'applications': applications.count(),
                'reviewing': applications.filter(status='reviewing').count(),
                'hires': applications.filter(status='hired').count(),
            },
            'specializations': specializations[:10],
            'skills': skills[:12],
            'cities': [{'name': name, 'vacancies': count} for name, count in city_counts.most_common(10)],
        })
