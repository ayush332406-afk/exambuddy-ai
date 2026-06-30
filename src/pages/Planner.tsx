import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Plus, CheckCircle2, Circle, Clock } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
}

interface Task {
  id: number;
  title: string;
  dueDate: string;
  completed: number;
  subjectId: number;
  subject: {
    name: string;
  }
}

export default function Planner() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await user!.getIdToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [tasksRes, subjRes] = await Promise.all([
        fetch('/api/tasks', { headers }),
        fetch('/api/subjects', { headers })
      ]);
      
      if (tasksRes.ok) setTasks(await tasksRes.ok ? await tasksRes.json() : []);
      if (subjRes.ok) setSubjects(await subjRes.ok ? await subjRes.json() : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !selectedSubject || !dueDate) return;
    
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTaskTitle,
          subjectId: selectedSubject,
          dueDate
        })
      });
      
      if (res.ok) {
        setNewTaskTitle('');
        setSelectedSubject('');
        setDueDate('');
        fetchData(); // refresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTask = async (taskId: number, currentStatus: number) => {
    try {
      const token = await user!.getIdToken();
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: currentStatus === 1 ? false : true
        })
      });
      
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: currentStatus === 1 ? 0 : 1 } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const upcomingTasks = tasks.filter(t => t.completed === 0);
  const completedTasks = tasks.filter(t => t.completed === 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Study Planner</h1>
        <p className="mt-1 text-sm text-gray-500">Organize your study schedule and track your progress.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <form onSubmit={addTask} className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
              placeholder="E.g., Read OS Chapter 3"
            />
          </div>
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              required
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
            >
              <option value="">Select subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5"
            />
          </div>
          <button
            type="submit"
            className="w-full md:w-auto text-white bg-indigo-600 hover:bg-indigo-700 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Task
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto max-h-96">
            {loading ? (
               <div className="text-center text-sm text-gray-500 my-4">Loading tasks...</div>
            ) : upcomingTasks.length === 0 ? (
               <div className="text-center text-sm text-gray-500 my-8">No upcoming tasks. You are all caught up!</div>
            ) : (
              upcomingTasks.map(task => (
                <div key={task.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-slate-50 hover:bg-white hover:border-indigo-200 transition-colors">
                  <button onClick={() => toggleTask(task.id, task.completed)} className="mt-0.5 text-gray-400 hover:text-indigo-600">
                    <Circle className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">{task.subject?.name}</span>
                      <span className="flex items-center text-orange-600">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Completed</h2>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 overflow-y-auto max-h-96">
            {loading ? (
               <div className="text-center text-sm text-gray-500 my-4">Loading tasks...</div>
            ) : completedTasks.length === 0 ? (
               <div className="text-center text-sm text-gray-500 my-8">No completed tasks yet.</div>
            ) : (
              completedTasks.map(task => (
                <div key={task.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50 opacity-75">
                  <button onClick={() => toggleTask(task.id, task.completed)} className="mt-0.5 text-green-500">
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-500 line-through">{task.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="bg-white px-2 py-1 rounded border border-gray-200">{task.subject?.name}</span>
                      <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
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
