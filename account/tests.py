from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from account.serializers import UserSerializer
from account.models import Application, Notification, User, Vacancy, VacancyView


class GenerateResumeSummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='candidate', email='candidate@example.com', password='safe-password',
            role='jobseeker', specialization='Python Developer', skills=['Python', 'Django'],
            projects=[{'name': 'CareerHub', 'desc': 'Карьерная платформа', 'tech': ['Django']}],
        )
        self.client.force_authenticate(self.user)

    @patch('account.views.requests.post')
    def test_generates_summary_from_authenticated_profile(self, post):
        nlp_response = Mock()
        nlp_response.raise_for_status.return_value = None
        nlp_response.json.return_value = {'field': 'summary', 'text': 'Готовое описание'}
        post.return_value = nlp_response
        response = self.client.post('/api/auth/me/generate-summary/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'text': 'Готовое описание'})
        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['targetRole'], 'Python Developer')
        self.assertEqual(payload['projects'][0]['description'], 'Карьерная платформа')

    def test_company_cannot_generate_candidate_summary(self):
        self.user.role = 'company'
        self.user.save(update_fields=['role'])
        response = self.client.post('/api/auth/me/generate-summary/', {}, format='json')
        self.assertEqual(response.status_code, 403)

    def test_target_role_is_required(self):
        self.user.specialization = ''
        self.user.save(update_fields=['specialization'])
        response = self.client.post('/api/auth/me/generate-summary/', {}, format='json')
        self.assertEqual(response.status_code, 400)


class CandidatePrivacyAndProjectTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.company = user_model.objects.create_user(
            username='company', email='company@example.com', password='safe-password', role='company'
        )
        self.student = user_model.objects.create_user(
            username='student', email='private@example.com', password='safe-password', role='student',
            phone='+77000000000', student_id='private-id', contact_sharing_enabled=False,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.company)

    def test_candidate_list_does_not_expose_private_fields(self):
        response = self.client.get('/api/auth/candidates/')
        self.assertEqual(response.status_code, 200)
        candidate = next(item for item in response.json() if item['id'] == self.student.id)
        for private_field in ('email', 'phone', 'student_id', 'diploma_file', 'resume_file', 'github_url'):
            self.assertNotIn(private_field, candidate)

    def test_contacts_require_candidate_consent(self):
        response = self.client.get(f'/api/auth/candidates/{self.student.id}/contacts/')
        self.assertEqual(response.status_code, 403)

    def test_project_github_is_optional_but_validated(self):
        serializer = UserSerializer(
            self.student,
            data={'projects': [{'name': 'CareerHub', 'desc': 'Платформа', 'tech': ['Django']}]},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer = UserSerializer(
            self.student,
            data={'projects': [{'name': 'CareerHub', 'desc': 'Платформа', 'tech': ['Django'], 'github_url': 'not-a-url'}]},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())

    def test_hiring_stats_are_paywalled(self):
        response = self.client.get('/api/auth/company-hiring-stats/')
        self.assertEqual(response.status_code, 402)


class LoginTests(TestCase):
    def setUp(self):
        get_user_model().objects.create_user(
            username='login-user', email='User@Example.com', password='correct-password', role='student'
        )
        self.client = APIClient()

    def test_login_trims_email_and_ignores_case(self):
        response = self.client.post(
            '/api/auth/login/', {'email': '  user@example.COM  ', 'password': 'correct-password'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.json())

    def test_wrong_password_returns_clear_error(self):
        response = self.client.post(
            '/api/auth/login/', {'email': 'user@example.com', 'password': 'wrong-password'}, format='json'
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()['error'], 'Неверный email или пароль.')


class ApplicationNotificationTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.company = user_model.objects.create_user(
            username='employer', email='employer@example.com', password='password', role='company'
        )
        self.candidate = user_model.objects.create_user(
            username='candidate-notify', email='notify@example.com', password='password', role='student'
        )
        self.other_candidate = user_model.objects.create_user(
            username='other-candidate', email='other@example.com', password='password', role='jobseeker'
        )
        self.vacancy = Vacancy.objects.create(
            company=self.company, title='Junior Python Developer', location='Алматы',
            type='Практика', description='Описание', requirements=['Python'], is_active=True,
        )
        self.application = Application.objects.create(vacancy=self.vacancy, candidate=self.candidate)

    def test_company_status_change_creates_candidate_notification(self):
        client = APIClient()
        client.force_authenticate(self.company)
        response = client.patch(
            f'/api/auth/my-vacancies/{self.vacancy.id}/applications/',
            {'application_id': self.application.id, 'status': 'reviewing'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        notification = Notification.objects.get(recipient=self.candidate)
        self.assertEqual(notification.application, self.application)
        self.assertFalse(notification.is_read)
        self.assertIn('На рассмотрении', notification.message)

    def test_repeating_same_status_does_not_duplicate_notification(self):
        self.application.status = 'reviewing'
        self.application.save()
        client = APIClient()
        client.force_authenticate(self.company)
        response = client.patch(
            f'/api/auth/my-vacancies/{self.vacancy.id}/applications/',
            {'application_id': self.application.id, 'status': 'reviewing'}, format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Notification.objects.count(), 0)

    def test_candidate_sees_only_own_applications_and_notifications(self):
        other_application = Application.objects.create(vacancy=self.vacancy, candidate=self.other_candidate)
        Notification.objects.create(
            recipient=self.other_candidate, application=other_application, title='Чужое', message='Чужое уведомление'
        )
        own_notification = Notification.objects.create(
            recipient=self.candidate, application=self.application, title='Своё', message='Своё уведомление'
        )
        client = APIClient()
        client.force_authenticate(self.candidate)
        applications_response = client.get('/api/auth/my-applications/')
        notifications_response = client.get('/api/auth/notifications/')
        self.assertEqual([item['id'] for item in applications_response.json()], [self.application.id])
        self.assertEqual([item['id'] for item in notifications_response.json()], [own_notification.id])

    def test_candidate_can_mark_only_own_notifications_read(self):
        own_notification = Notification.objects.create(
            recipient=self.candidate, application=self.application, title='Своё', message='Своё уведомление'
        )
        other_application = Application.objects.create(vacancy=self.vacancy, candidate=self.other_candidate)
        other_notification = Notification.objects.create(
            recipient=self.other_candidate, application=other_application, title='Чужое', message='Чужое уведомление'
        )
        client = APIClient()
        client.force_authenticate(self.candidate)
        response = client.patch('/api/auth/notifications/read/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        own_notification.refresh_from_db()
        other_notification.refresh_from_db()
        self.assertTrue(own_notification.is_read)
        self.assertFalse(other_notification.is_read)


class CandidateToolsTests(TestCase):
    def setUp(self):
        self.company = User.objects.create_user(username='tools-company', email='tools-company@example.com', password='password', role='company')
        self.candidate = User.objects.create_user(username='tools-candidate', email='tools-candidate@example.com', password='password', role='student')

    def test_company_invite_creates_candidate_notification(self):
        client = APIClient()
        client.force_authenticate(self.company)
        response = client.post(f'/api/auth/candidates/{self.candidate.pk}/invite/')
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Notification.objects.filter(recipient=self.candidate, application__isnull=True).exists())

    def test_python_test_is_scored_and_saved_server_side(self):
        client = APIClient()
        client.force_authenticate(self.candidate)
        questions = client.get('/api/auth/tests/python/')
        self.assertEqual(questions.status_code, 200)
        self.assertNotIn('correct', questions.json()['questions'][0])
        response = client.post('/api/auth/tests/python/', {'answers': {'1': 'B', '2': 'C', '3': 'A', '4': 'B', '5': 'C'}}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['score'], 100)
        self.candidate.refresh_from_db()
        self.assertEqual(self.candidate.test_results[-1]['score'], 100)


class CompanyAccountProtectionTests(TestCase):
    def test_company_account_cannot_be_deleted_via_api(self):
        company = User.objects.create_user(
            username='protected-company', email='protected-company@example.com',
            password='password', role='company',
        )
        client = APIClient()
        client.force_authenticate(company)
        response = client.delete('/api/auth/me/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(User.objects.filter(pk=company.pk).exists())

    def test_company_can_update_contact_person(self):
        company = User.objects.create_user(
            username='editable-company', email='editable-company@example.com',
            password='password', role='company',
        )
        client = APIClient()
        client.force_authenticate(company)
        response = client.patch('/api/auth/me/', {
            'contact_person': 'Айгерим Бекова',
            'contact_position': 'HR Business Partner',
            'contact_email': 'aigerim.hr@example.com',
            'phone': '+7 700 123 45 67',
        }, format='json')
        self.assertEqual(response.status_code, 200)
        company.refresh_from_db()
        self.assertEqual(company.contact_person, 'Айгерим Бекова')
        self.assertEqual(company.contact_position, 'HR Business Partner')
        self.assertEqual(company.contact_email, 'aigerim.hr@example.com')
        self.assertEqual(company.email, 'editable-company@example.com')


class PlatformAnalyticsTests(TestCase):
    def test_public_analytics_returns_only_aggregates(self):
        company = User.objects.create_user(
            username='analytics-company', email='analytics-company@example.com',
            password='password', role='company',
        )
        candidate = User.objects.create_user(
            username='analytics-candidate', email='private-analytics@example.com',
            password='password', role='student', specialization='Python Developer',
            skills=['Python', 'Django'], phone='+7 777 000 00 00',
        )
        vacancy = Vacancy.objects.create(
            company=company, title='Junior Python Developer', location='Алматы',
            type='Практика', description='Backend', requirements=['Python', 'Django'],
        )
        VacancyView.objects.create(vacancy=vacancy, viewer=candidate)
        Application.objects.create(vacancy=vacancy, candidate=candidate, status='hired')

        response = APIClient().get('/api/auth/analytics/?months=6')

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload['period_months'], 6)
        self.assertEqual(payload['summary']['active_vacancies'], 1)
        self.assertEqual(payload['summary']['candidates'], 1)
        self.assertEqual(payload['funnel']['views'], 1)
        self.assertTrue(any(item['name'] == 'Python' for item in payload['specializations']))
        serialized = str(payload)
        self.assertNotIn(candidate.email, serialized)
        self.assertNotIn(candidate.phone, serialized)

    def test_analytics_rejects_unsupported_period_by_using_default(self):
        response = APIClient().get('/api/auth/analytics/?months=7')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['period_months'], 12)
