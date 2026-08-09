import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Brain, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import AppNavbar from '../components/AppNavbar';

function ResultModal({ result, onClose, onRetry }) {
  const passed = result.passed;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-outline-variant rounded-2xl max-w-md w-full p-8 text-center shadow-glass-lg">
        {passed ? <CheckCircle className="w-14 h-14 text-tertiary mx-auto mb-4" /> : <AlertCircle className="w-14 h-14 text-error mx-auto mb-4" />}
        <h2 className="text-2xl font-bold text-on-surface mb-2">{passed ? 'Тест пройден' : 'Тест не пройден'}</h2>
        <div className={`text-5xl font-bold my-6 ${passed ? 'text-tertiary' : 'text-error'}`}>{result.score}%</div>
        <p className="text-on-surface-variant mb-2">Правильных ответов: {result.correct} из {result.total}</p>
        <p className="text-sm text-outline mb-7">Результат сохранён в профиле. Проходной балл — 70%.</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onRetry}><RotateCcw className="w-4 h-4" /> Повторить</button>
          <button className="btn-primary flex-1" onClick={onClose}>Готово</button>
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.pythonTest()
      .then(data => {
        setQuestions(data.questions || []);
        setTimeLeft(data.duration_seconds || 600);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback(async () => {
    if (submitting || result || !questions.length) return;
    setSubmitting(true);
    setError('');
    try {
      setResult(await api.submitPythonTest(answers));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions.length, result, submitting]);

  useEffect(() => {
    if (loading || result || submitting) return undefined;
    if (timeLeft <= 0) { finish(); return undefined; }
    const timer = setTimeout(() => setTimeLeft(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [finish, loading, result, submitting, timeLeft]);

  const retry = () => { setAnswers({}); setCurrent(0); setTimeLeft(600); setResult(null); };
  const question = questions[current];
  const allAnswered = questions.length > 0 && questions.every(item => answers[item.id]);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <button className="btn-ghost" onClick={() => navigate('/companies')}><ArrowLeft className="w-4 h-4" /> Назад</button>
          <span className="flex items-center gap-2 text-sm text-on-surface bg-surface-container border border-outline-variant rounded-lg px-3 py-2"><Clock className="w-4 h-4" /> {minutes}:{seconds}</span>
        </div>
        <div className="text-center mb-8">
          <Brain className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-on-surface">Junior Python Developer</h1>
          <p className="text-on-surface-variant mt-2">Тест проверяется сервером, результат сохраняется в профиле.</p>
        </div>
        {error && <div className="alert-error mb-5">{error}</div>}
        {loading && <div className="glass-card p-8 text-on-surface">Загрузка вопросов…</div>}
        {!loading && !question && !error && <div className="glass-card p-8 text-on-surface">Вопросы не найдены.</div>}
        {question && (
          <div className="glass-card p-6 sm:p-8">
            <p className="text-xs text-outline mb-3">Вопрос {current + 1} из {questions.length}</p>
            <h2 className="text-lg font-semibold text-on-surface mb-6">{question.question}</h2>
            <div className="space-y-3">
              {question.options.map(option => (
                <button key={option.id} onClick={() => setAnswers(previous => ({ ...previous, [question.id]: option.id }))} className={`w-full text-left p-4 rounded-xl border transition-colors ${answers[question.id] === option.id ? 'border-primary bg-primary/10 text-on-surface' : 'border-outline-variant text-on-surface-variant hover:border-outline'}`}>
                  <span className="font-bold mr-3">{option.id}</span>{option.text}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-8 gap-3">
              <button className="btn-secondary" disabled={current === 0} onClick={() => setCurrent(value => value - 1)}>Назад</button>
              {current < questions.length - 1
                ? <button className="btn-primary" disabled={!answers[question.id]} onClick={() => setCurrent(value => value + 1)}>Далее</button>
                : <button className="btn-primary" disabled={!allAnswered || submitting} onClick={finish}>{submitting ? 'Проверка…' : 'Завершить тест'}</button>}
            </div>
          </div>
        )}
      </main>
      {result && <ResultModal result={result} onRetry={retry} onClose={() => navigate('/profile')} />}
    </div>
  );
}
