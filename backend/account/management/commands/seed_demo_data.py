from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from account.models import Application, Notification, User, Vacancy, VacancyView


DEMO_PASSWORD = "Demo12345!"


COMPANIES = (
    {
        "name": "TechNova Kazakhstan",
        "industry": "Разработка программного обеспечения",
        "size": "51–200 сотрудников",
        "city": "Алматы",
        "about": "Продуктовая IT-компания: веб-сервисы, мобильные приложения и облачная инфраструктура.",
    },
    {
        "name": "QazaqSoft",
        "industry": "Корпоративные IT-решения",
        "size": "201–500 сотрудников",
        "city": "Астана",
        "about": "Создаём цифровые сервисы для бизнеса и государственного сектора Казахстана.",
    },
    {
        "name": "DataStep AI",
        "industry": "Data Science и искусственный интеллект",
        "size": "11–50 сотрудников",
        "city": "Алматы",
        "about": "Команда аналитиков и ML-инженеров, которая превращает данные в работающие продукты.",
    },
    {
        "name": "FinBridge",
        "industry": "FinTech",
        "size": "51–200 сотрудников",
        "city": "Астана",
        "about": "Разрабатываем безопасные финансовые продукты и платёжную инфраструктуру.",
    },
    {
        "name": "AeroLabs",
        "industry": "Облачные технологии",
        "size": "11–50 сотрудников",
        "city": "Караганда",
        "about": "Облачная платформа и DevOps-инструменты для технологических команд.",
    },
    {
        "name": "IITU Innovation Lab",
        "industry": "EdTech и исследования",
        "size": "11–50 сотрудников",
        "city": "Алматы",
        "about": "Лаборатория прикладных исследований и студенческих технологических проектов.",
    },
)


CANDIDATE_NAMES = (
    ("Айдана", "Серикова"),
    ("Алихан", "Нурланов"),
    ("Диана", "Ким"),
    ("Тимур", "Ахметов"),
    ("Аружан", "Садыкова"),
    ("Данияр", "Ибраев"),
    ("София", "Волкова"),
    ("Мирас", "Жумабеков"),
    ("Алина", "Омарова"),
    ("Арсен", "Ли"),
    ("Мадина", "Тлеубаева"),
    ("Никита", "Петров"),
    ("Жансая", "Ермекова"),
    ("Руслан", "Беков"),
    ("Камила", "Абдрахманова"),
    ("Илья", "Соколов"),
    ("Назерке", "Касымова"),
    ("Санжар", "Муратов"),
    ("Полина", "Орлова"),
    ("Ерасыл", "Токтаров"),
    ("Адель", "Мусина"),
    ("Максим", "Громов"),
    ("Амина", "Жанибекова"),
    ("Алексей", "Цой"),
)


TRACKS = (
    {
        "specialization": "Junior Frontend Developer",
        "skills": ["JavaScript", "TypeScript", "React", "HTML", "CSS"],
        "project": "Интерфейс личного кабинета",
    },
    {
        "specialization": "Junior Python Backend Developer",
        "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "REST API"],
        "project": "API сервиса бронирования",
    },
    {
        "specialization": "Junior Java Developer",
        "skills": ["Java", "Spring Boot", "PostgreSQL", "Docker", "Git"],
        "project": "Сервис обработки заявок",
    },
    {
        "specialization": "Junior Data Analyst",
        "skills": ["Python", "SQL", "Pandas", "NumPy", "Power BI"],
        "project": "Дашборд учебной аналитики",
    },
    {
        "specialization": "Junior QA Engineer",
        "skills": ["Manual Testing", "Postman", "SQL", "Selenium", "Jira"],
        "project": "Набор автотестов для интернет-магазина",
    },
    {
        "specialization": "Junior DevOps Engineer",
        "skills": ["Linux", "Docker", "GitLab CI", "Kubernetes", "Nginx"],
        "project": "CI/CD для учебного проекта",
    },
    {
        "specialization": "Junior Mobile Flutter Developer",
        "skills": ["Dart", "Flutter", "Firebase", "REST API", "Git"],
        "project": "Мобильное приложение расписания",
    },
    {
        "specialization": "Junior UI/UX Designer",
        "skills": ["Figma", "UI Design", "UX Research", "Prototyping", "Design System"],
        "project": "Редизайн платформы стажировок",
    },
)


VACANCY_TEMPLATES = (
    ("Стажёр Frontend-разработчик", "Frontend", ["JavaScript", "React", "HTML", "CSS"], "Практика"),
    ("Junior React Developer", "Frontend", ["JavaScript", "TypeScript", "React", "Git"], "Полная занятость"),
    ("Junior Python Developer", "Backend", ["Python", "Django", "PostgreSQL", "REST API"], "Полная занятость"),
    ("Стажёр Backend-разработчик", "Backend", ["Python", "FastAPI", "SQL", "Docker"], "Практика"),
    ("Junior Java Developer", "Backend", ["Java", "Spring Boot", "PostgreSQL", "Git"], "Полная занятость"),
    ("Стажёр Data Analyst", "Data & AI", ["Python", "SQL", "Pandas", "Power BI"], "Практика"),
    ("Junior ML Engineer", "Data & AI", ["Python", "NumPy", "Pandas", "Machine Learning"], "Полная занятость"),
    ("Junior QA Engineer", "Quality Assurance", ["Manual Testing", "Postman", "SQL", "Jira"], "Полная занятость"),
    ("Стажёр QA Automation", "Quality Assurance", ["Python", "Selenium", "Postman", "Git"], "Практика"),
    ("Junior DevOps Engineer", "Infrastructure", ["Linux", "Docker", "GitLab CI", "Nginx"], "Полная занятость"),
    ("Стажёр Cloud Engineer", "Infrastructure", ["Linux", "Docker", "Kubernetes", "Cloud"], "Практика"),
    ("Junior Flutter Developer", "Mobile", ["Dart", "Flutter", "Firebase", "REST API"], "Полная занятость"),
    ("Стажёр Android Developer", "Mobile", ["Kotlin", "Android", "Git", "REST API"], "Практика"),
    ("Junior UI/UX Designer", "Design", ["Figma", "UI Design", "UX Research", "Prototyping"], "Полная занятость"),
    ("Стажёр Product Designer", "Design", ["Figma", "Design System", "UX Research", "Prototyping"], "Практика"),
    ("Junior Node.js Developer", "Backend", ["JavaScript", "Node.js", "PostgreSQL", "Docker"], "Полная занятость"),
    ("Стажёр Fullstack Developer", "Development", ["JavaScript", "React", "Node.js", "SQL"], "Практика"),
    ("Junior Business Analyst", "Analytics", ["SQL", "BPMN", "UML", "Jira"], "Полная занятость"),
    ("Стажёр по кибербезопасности", "Security", ["Linux", "Networking", "Python", "OWASP"], "Практика"),
    ("Junior Support Engineer", "Technical Support", ["Linux", "SQL", "Networking", "English"], "Полная занятость"),
    ("Стажёр 1C-разработчик", "Enterprise", ["1C", "SQL", "Git", "Алгоритмы"], "Практика"),
    ("Junior .NET Developer", "Backend", ["C#", ".NET", "PostgreSQL", "REST API"], "Полная занятость"),
    ("Стажёр Project Coordinator", "Project Management", ["Jira", "Agile", "English", "Communication"], "Практика"),
    ("Junior Product Analyst", "Analytics", ["SQL", "Python", "A/B Testing", "Power BI"], "Полная занятость"),
)


def months_ago(reference, amount, day=10):
    month_index = reference.year * 12 + reference.month - 1 - amount
    year, zero_based_month = divmod(month_index, 12)
    return reference.replace(
        year=year,
        month=zero_based_month + 1,
        day=min(day, 28),
        hour=10,
        minute=0,
        second=0,
        microsecond=0,
    )


class Command(BaseCommand):
    help = "Добавляет связанные демонстрационные данные CareerHub, не удаляя реальные записи."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEMO_PASSWORD,
            help="Пароль для всех демонстрационных аккаунтов.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        now = timezone.now()

        companies = []
        for index, data in enumerate(COMPANIES, start=1):
            email = f"demo.company{index:02d}@careerhub.local"
            company, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "username": f"demo_company_{index:02d}",
                    "role": "company",
                    "first_name": data["name"],
                    "last_name": "",
                    "about": data["about"],
                    "city": data["city"],
                    "phone": f"+7 700 555 {index:02d} {index:02d}",
                    "industry": data["industry"],
                    "company_size": data["size"],
                    "website": f"https://company{index:02d}.example.com",
                    "contact_person": f"Менеджер по найму {index}",
                    "contact_position": "HR Business Partner",
                    "contact_email": f"hr{index:02d}@careerhub.local",
                    "profile_completed": True,
                    "is_student": False,
                },
            )
            company.set_password(password)
            company.save(update_fields=("password",))
            User.objects.filter(pk=company.pk).update(date_joined=months_ago(now, 13 - index))
            companies.append(company)

        candidates = []
        cities = ("Алматы", "Астана", "Шымкент", "Караганда", "Алматы", "Астана")
        universities = ("IITU", "Satbayev University", "КБТУ", "Astana IT University")
        for index, (first_name, last_name) in enumerate(CANDIDATE_NAMES, start=1):
            track = TRACKS[(index - 1) % len(TRACKS)]
            role = "student" if index % 3 else "jobseeker"
            email = f"demo.candidate{index:02d}@careerhub.local"
            project = {
                "name": track["project"],
                "desc": "Командный учебный проект с авторизацией, API, тестированием и адаптивным интерфейсом.",
                "tech": track["skills"][:4],
                "github_url": f"https://github.com/careerhub-demo/project-{index:02d}",
            }
            experience = [] if role == "student" else [{
                "company": "Учебная лаборатория",
                "role": track["specialization"],
                "start_date": "2025-02",
                "end_date": "2025-07",
                "is_current": False,
                "desc": "Разработка и тестирование функциональности в небольшой продуктовой команде.",
            }]
            candidate, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "username": f"demo_candidate_{index:02d}",
                    "role": role,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_student": role == "student",
                    "student_id": f"DEMO-{2026000 + index}" if role == "student" else None,
                    "university": universities[(index - 1) % len(universities)],
                    "about": f"Начинающий специалист направления {track['specialization']}. Ищу практику и реальные продуктовые задачи.",
                    "skills": track["skills"],
                    "education_info": "Бакалавриат, информационные технологии, 2022–2026",
                    "phone": f"+7 701 400 {index:02d} {index:02d}",
                    "github_url": f"https://github.com/careerhub-demo/candidate-{index:02d}",
                    "specialization": track["specialization"],
                    "city": cities[(index - 1) % len(cities)],
                    "contact_sharing_enabled": index % 3 == 0,
                    "experience": experience,
                    "projects": [project],
                    "test_results": [{
                        "tech": track["skills"][0],
                        "level": "Junior",
                        "score": 62 + (index * 3) % 35,
                        "date": "2026-07-15",
                    }],
                    "profile_completed": True,
                },
            )
            candidate.set_password(password)
            candidate.save(update_fields=("password",))
            User.objects.filter(pk=candidate.pk).update(date_joined=months_ago(now, (index - 1) % 12, day=3 + index % 20))
            candidates.append(candidate)

        vacancies = []
        for index, template in enumerate(VACANCY_TEMPLATES):
            title, department, requirements, employment_type = template
            company = companies[index % len(companies)]
            location = cities[index % len(cities)]
            vacancy, _ = Vacancy.objects.update_or_create(
                company=company,
                title=title,
                defaults={
                    "department": department,
                    "location": location,
                    "salary": f"{180 + index * 10} 000 – {280 + index * 15} 000 ₸",
                    "type": employment_type,
                    "description": (
                        "Работа с наставником в продуктовой команде. Задачи включают разработку, "
                        "код-ревью, тестирование и участие в командных встречах."
                    ),
                    "requirements": requirements,
                    "is_active": index % 7 != 0,
                },
            )
            Vacancy.objects.filter(pk=vacancy.pk).update(created_at=months_ago(now, index % 12, day=5 + index % 18))
            vacancies.append(vacancy)

        statuses = ("pending", "reviewing", "rejected", "hired", "reviewing", "pending", "rejected")
        applications = []
        for candidate_index, candidate in enumerate(candidates):
            for offset in range(3):
                vacancy = vacancies[(candidate_index * 3 + offset * 5) % len(vacancies)]
                status = statuses[(candidate_index + offset) % len(statuses)]
                application, _ = Application.objects.update_or_create(
                    vacancy=vacancy,
                    candidate=candidate,
                    defaults={"status": status},
                )
                created_at = months_ago(now, (candidate_index + offset * 2) % 12, day=8 + candidate_index % 15)
                updated_at = created_at + timedelta(days=2 + (candidate_index + offset) % 12)
                Application.objects.filter(pk=application.pk).update(
                    created_at=created_at,
                    updated_at=min(updated_at, now),
                )
                applications.append(application)

                if status != "pending":
                    status_messages = {
                        "reviewing": ("Отклик на рассмотрении", f"Компания начала рассматривать ваш отклик на вакансию «{vacancy.title}»."),
                        "rejected": ("Ответ по отклику", f"Компания завершила рассмотрение отклика на вакансию «{vacancy.title}»."),
                        "hired": ("Поздравляем с оффером!", f"Компания выбрала вас на вакансию «{vacancy.title}»."),
                    }
                    title, message = status_messages[status]
                    notification, _ = Notification.objects.update_or_create(
                        recipient=candidate,
                        application=application,
                        defaults={
                            "title": title,
                            "message": message,
                            "is_read": (candidate_index + offset) % 3 == 0,
                        },
                    )
                    Notification.objects.filter(pk=notification.pk).update(created_at=min(updated_at, now))

        for candidate_index, candidate in enumerate(candidates):
            for offset in range(6):
                vacancy = vacancies[(candidate_index * 2 + offset * 3) % len(vacancies)]
                view, _ = VacancyView.objects.get_or_create(vacancy=vacancy, viewer=candidate)
                VacancyView.objects.filter(pk=view.pk).update(
                    created_at=months_ago(now, (candidate_index + offset) % 12, day=4 + offset * 3)
                )

        self.stdout.write(self.style.SUCCESS("Демонстрационные данные CareerHub готовы."))
        self.stdout.write(f"  Компании: {len(companies)}")
        self.stdout.write(f"  Кандидаты: {len(candidates)}")
        self.stdout.write(f"  Вакансии: {len(vacancies)}")
        self.stdout.write(f"  Отклики: {len(applications)}")
        self.stdout.write(f"  Просмотры: {VacancyView.objects.filter(viewer__email__startswith='demo.candidate').count()}")
        self.stdout.write(f"  Уведомления: {Notification.objects.filter(recipient__email__startswith='demo.candidate').count()}")
        self.stdout.write(f"  Пароль demo-аккаунтов: {password}")
