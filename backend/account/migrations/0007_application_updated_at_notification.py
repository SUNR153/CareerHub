from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_status_notifications(apps, schema_editor):
    Application = apps.get_model('account', 'Application')
    Notification = apps.get_model('account', 'Notification')
    labels = {
        'reviewing': 'На рассмотрении',
        'rejected': 'Отклонён',
        'hired': 'Нанят',
    }
    notifications = []
    for application in Application.objects.exclude(status='pending').select_related('vacancy__company', 'candidate'):
        label = labels.get(application.status, application.status)
        company = application.vacancy.company
        company_name = f'{company.first_name} {company.last_name}'.strip() or company.username
        notifications.append(Notification(
            recipient=application.candidate,
            application=application,
            title=f'Статус отклика: {label}',
            message=f'Компания {company_name} изменила статус вашего отклика на вакансию «{application.vacancy.title}» на «{label}».',
        ))
    Notification.objects.bulk_create(notifications)


class Migration(migrations.Migration):
    dependencies = [
        ('account', '0006_vacancy_views_and_applications'),
    ]

    operations = [
        migrations.AddField(
            model_name='application',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('message', models.TextField()),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='account.application')),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-created_at',)},
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read', '-created_at'], name='notification_inbox_idx'),
        ),
        migrations.RunPython(backfill_status_notifications, migrations.RunPython.noop),
    ]
