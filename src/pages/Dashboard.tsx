import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Clock, BookOpen, HelpCircle, ChevronRight, BookText } from 'lucide-react';
import ExamCarousel from '../components/ExamCarousel';
import useSWR from 'swr';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
  examDate?: string;
}

interface Note {
  id: number;
  title: string;
  createdAt: string;
  subject: {
    name: string;
  }
}

interface Quiz {
  id: number;
  score: number;
  totalQuestions: number;
  createdAt: string;
  note: {
    title: string;
  }
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);
const authFetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (user) {
      user.getIdToken().then(setToken).catch(console.error);
    }
  }, [user]);

  const { data: subjects = [], isLoading: loadingSubjects } = useSWR<Subject[]>('/api/subjects', fetcher);
  const { data: allNotes = [], isLoading: loadingNotes } = useSWR<Note[]>('/api/notes', fetcher);
  const { data: allQuizzes = [], isLoading: loadingQuizzes } = useSWR<Quiz[]>(token ? ['/api/quizzes', token] : null, authFetcher);

  const notes = allNotes.slice(0, 3);
  const quizzes = allQuizzes.slice(0, 3);
  const loading = loadingSubjects || loadingNotes || (user && !token);

  const [selectedSemester, setSelectedSemester] = useState<number>(2);

  const filteredSubjects = subjects.filter(s => s.semester === selectedSemester);
  const subjectsWithExam = filteredSubjects.filter(s => s.examDate && s.examDate !== "null" && s.examDate !== "undefined");
  const anyExamsScheduled = subjects.some(s => s.examDate && s.examDate !== "null" && s.examDate !== "undefined");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 sm:p-8 transition-colors">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Ready to prepare for your upcoming exams?</p>
        
        {loading ? (
          <div className="mt-8">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-full h-24 bg-gray-100 dark:bg-slate-700 rounded-xl"></div>
                ))}
              </div>
          </div>
        ) : anyExamsScheduled ? (
          <div className="mt-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exam Countdown</h2>
                {userProfile?.role === 'admin' && (
                  <Link to="/admin" className="ml-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-md">
                    Manage Exam Dates
                  </Link>
                )}
              </div>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
            
            {subjectsWithExam.length > 0 ? (
              <ExamCarousel subjects={subjectsWithExam} />
            ) : (
              <div className="bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Exam schedule not announced yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-8 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-xl p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 font-medium">Exam schedule not announced yet.</p>
            {userProfile?.role === 'admin' && (
              <div className="mt-4">
                <Link to="/admin" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-md inline-block">
                  Manage Exam Dates
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Notes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-500 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Notes</h2>
            </div>
            <Link to="/notes" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 flex-1 flex flex-col">
            {loading ? (
               <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading notes...</div>
            ) : notes.length === 0 ? (
               <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No notes uploaded yet.</div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-start gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                    <BookText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{note.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{note.subject.name} • {formatDate(note.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Quizzes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-orange-500 dark:text-orange-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Quizzes</h2>
            </div>
            {user && (
              <Link to="/quizzes" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center">
                Take a New Quiz <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            )}
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700 flex-1 flex flex-col justify-center">
            {!user ? (
               <div className="p-8 text-center">
                 <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Sign in to track your quiz performance and get personalized insights.</p>
                 <Link to="/login" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none">
                   Sign In
                 </Link>
               </div>
            ) : loading ? (
               <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
               <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No quizzes taken yet.</div>
            ) : (
              quizzes.map((quiz) => (
                <div key={quiz.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{quiz.note.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(quiz.createdAt)}</p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold px-3 py-1 rounded-full text-sm ml-4 whitespace-nowrap">
                    {quiz.score} / {quiz.totalQuestions}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
