import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HelpCircle, CheckCircle2 } from 'lucide-react';
import useSWR from 'swr';

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

const authFetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export default function Quizzes() {
  const { user } = useAuth();
  const [token, setToken] = useState('');

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken).catch(console.error);
    }
  }, [user]);

  const { data: quizzes = [], isLoading: loadingQuizzes } = useSWR<Quiz[]>(token ? ['/api/quizzes', token] : null, authFetcher);
  const loading = loadingQuizzes || (user && !token);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quiz History</h1>
        <p className="mt-1 text-sm text-gray-500">Review your past quiz performances generated from your notes.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-900">No quizzes taken yet</h3>
            <p className="mt-1 text-sm text-gray-500">Go to your Notes to generate a quiz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map((quiz) => {
              const percentage = Math.round((quiz.score / quiz.totalQuestions) * 100);
              const date = new Date(quiz.createdAt).toLocaleDateString();
              
              return (
                <div key={quiz.id} className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1" title={quiz.note.title}>
                        {quiz.note.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">{quiz.note.subject.name}</p>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {date}
                    </span>
                  </div>
                  
                  <div className="flex items-end justify-between mt-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-gray-900">{quiz.score}</span>
                        <span className="text-sm font-medium text-gray-500">/ {quiz.totalQuestions}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className={`text-lg font-bold ${
                        percentage >= 80 ? 'text-green-600' : 
                        percentage >= 60 ? 'text-orange-500' : 'text-red-600'
                      }`}>
                        {percentage}%
                      </div>
                      {percentage >= 80 && (
                        <div className="flex items-center text-xs text-green-600 mt-1">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Excellent
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                    <div 
                      className={`h-2 rounded-full ${
                        percentage >= 80 ? 'bg-green-500' : 
                        percentage >= 60 ? 'bg-orange-400' : 'bg-red-500'
                      }`} 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
