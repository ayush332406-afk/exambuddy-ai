import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';

interface Quiz {
  id: number;
  score: number;
  totalQuestions: number;
  createdAt: string;
  note: {
    title: string;
    subject: {
      name: string;
    }
  }
}

export default function Analytics() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchQuizzes();
    }
  }, [user]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const token = await user!.getIdToken();
      const res = await fetch('/api/quizzes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setQuizzes(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalQuizzes = quizzes.length;
  const averageScore = totalQuizzes > 0 
    ? Math.round(quizzes.reduce((acc, q) => acc + (q.score / q.totalQuestions) * 100, 0) / totalQuizzes)
    : 0;
  
  // Data for bar chart (average score per subject)
  const subjectScores: Record<string, { totalScore: number; count: number }> = {};
  quizzes.forEach(q => {
    const subjectName = q.note.subject.name;
    const percentage = (q.score / q.totalQuestions) * 100;
    if (!subjectScores[subjectName]) {
      subjectScores[subjectName] = { totalScore: 0, count: 0 };
    }
    subjectScores[subjectName].totalScore += percentage;
    subjectScores[subjectName].count += 1;
  });

  const subjectData = Object.keys(subjectScores).map(name => ({
    subject: name.split(' (')[0], // Use short name
    averageScore: Math.round(subjectScores[name].totalScore / subjectScores[name].count)
  }));

  // Data for line chart (progress over time)
  // Sort quizzes by date ascending for line chart
  const timelineData = [...quizzes].reverse().map(q => ({
    date: new Date(q.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    score: Math.round((q.score / q.totalQuestions) * 100),
    title: q.note.title
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Performance Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Track your academic progress and quiz scores over time.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 mr-4">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Quizzes Taken</p>
            <p className="text-2xl font-bold text-gray-900">{totalQuizzes}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center">
          <div className="p-3 rounded-xl bg-green-50 text-green-600 mr-4">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Average Quiz Score</p>
            <p className="text-2xl font-bold text-gray-900">{averageScore}%</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600 mr-4">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Strongest Subject</p>
            <p className="text-lg font-bold text-gray-900 line-clamp-1">
              {subjectData.length > 0 
                ? subjectData.reduce((prev, current) => (prev.averageScore > current.averageScore) ? prev : current).subject 
                : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance by Subject</h2>
          {loading ? (
             <div className="h-64 flex items-center justify-center text-gray-500">Loading data...</div>
          ) : subjectData.length === 0 ? (
             <div className="h-64 flex items-center justify-center text-gray-500">No data available. Take a quiz!</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="averageScore" name="Average Score (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Timeline Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Progress Timeline</h2>
          {loading ? (
             <div className="h-64 flex items-center justify-center text-gray-500">Loading data...</div>
          ) : timelineData.length === 0 ? (
             <div className="h-64 flex items-center justify-center text-gray-500">No data available. Take a quiz!</div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    name="Score (%)" 
                    stroke="#0ea5e9" 
                    strokeWidth={3} 
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
