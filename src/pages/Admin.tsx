import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, Trash2, Edit2, Plus, Calendar, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);
const authFetcher = async ([url, token]: [string, string]) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export default function Admin() {
  const { user, userProfile } = useAuth();
  const [token, setToken] = useState('');
  
  React.useEffect(() => {
    if (user) user.getIdToken().then(setToken).catch(console.error);
  }, [user]);

  const [activeTab, setActiveTab] = useState<'subjects' | 'users' | 'assignments'>('subjects');

  // SWR queries (no polling needed due to realtime sync)
  const { data: subjects = [], isLoading: loadingSubjects } = useSWR<any[]>('/api/subjects', fetcher);
  const { data: assignments = [], isLoading: loadingAssignments } = useSWR<any[]>('/api/assignments', fetcher);
  const { data: users = [], isLoading: loadingUsers } = useSWR<any[]>(token && activeTab === 'users' ? ['/api/users', token] : null, authFetcher);

  const loading = (activeTab === 'subjects' && loadingSubjects) ||
                  (activeTab === 'assignments' && (loadingSubjects || loadingAssignments)) ||
                  (activeTab === 'users' && loadingUsers);

  // Subject Form State
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', code: '', semester: '1', examDate: '' });

  // Assignment Form State
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [assignmentFormData, setAssignmentFormData] = useState({ title: '', subjectId: '', description: '', dueDate: '' });
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      const token = await user?.getIdToken();
      const method = editingSubject ? 'PUT' : 'POST';
      const url = editingSubject ? `/api/subjects/${editingSubject.id}` : '/api/subjects';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowSubjectForm(false);
        setEditingSubject(null);
        setFormData({ name: '', code: '', semester: '1', examDate: '' });
        mutate('/api/subjects');
      } else {
        alert('Failed to save subject');
      }
    } catch (error) {
      console.error('Error saving subject:', error);
    }
  };

  const handleDeleteSubject = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) mutate('/api/subjects');
    } catch (error) {
      console.error('Error deleting subject:', error);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) mutate(['/api/users', token]);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment && !assignmentFile) {
      alert("Please select a file.");
      return;
    }
    try {
      const token = await user?.getIdToken();
      const method = editingAssignment ? 'PUT' : 'POST';
      const url = editingAssignment ? `/api/assignments/${editingAssignment.id}` : '/api/assignments';
      
      const formData = new FormData();
      formData.append('title', assignmentFormData.title);
      formData.append('subjectId', assignmentFormData.subjectId);
      formData.append('description', assignmentFormData.description);
      formData.append('dueDate', assignmentFormData.dueDate || 'null');
      if (assignmentFile) {
        formData.append('file', assignmentFile);
      }

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      if (res.ok) {
        setShowAssignmentForm(false);
        setEditingAssignment(null);
        setAssignmentFormData({ title: '', subjectId: '', description: '', dueDate: '' });
        setAssignmentFile(null);
        mutate('/api/assignments');
      } else {
        const errorData = await res.json();
        alert(`Failed to save assignment: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/assignments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) mutate('/api/assignments');
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const isAdminEmail = user?.email?.trim().toLowerCase() === 'ayush332406@gmail.com';
  if (userProfile?.role !== 'admin' && !isAdminEmail) {
    return <div className="p-8 text-center text-red-500 font-medium">Access Denied. Admins only.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
      
      <div className="flex border-b border-gray-200 mb-6 hide-scrollbar overflow-x-auto">
        <button
          onClick={() => setActiveTab('subjects')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'subjects' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Subjects & Exams
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'assignments' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <ClipboardList className="w-4 h-4 mr-2" />
          Assignments
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center whitespace-nowrap ${activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
        >
          <Users className="w-4 h-4 mr-2" />
          Users
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : activeTab === 'subjects' ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingSubject(null);
                setFormData({ name: '', code: '', semester: '1', examDate: '' });
                setShowSubjectForm(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Subject
            </button>
          </div>

          {showSubjectForm && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
              <h2 className="text-lg font-bold mb-4">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
              <form onSubmit={handleSubjectSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                    <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                    <select required value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500">
                      {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Exam Date (Optional)</label>
                    <input type="date" value={formData.examDate} onChange={e => setFormData({...formData, examDate: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowSubjectForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save Subject</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto hide-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Semester</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {subjects.map(subject => (
                  <tr key={subject.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{subject.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Sem {subject.semester}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {subject.examDate ? format(new Date(subject.examDate), 'PP') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => {
                        setEditingSubject(subject);
                        setFormData({
                          name: subject.name,
                          code: subject.code,
                          semester: subject.semester.toString(),
                          examDate: subject.examDate ? new Date(subject.examDate).toISOString().slice(0,10) : ''
                        });
                        setShowSubjectForm(true);
                      }} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteSubject(subject.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'assignments' ? (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => {
                setEditingAssignment(null);
                setAssignmentFormData({ title: '', subjectId: subjects.length > 0 ? subjects[0].id.toString() : '', description: '', dueDate: '' });
                setAssignmentFile(null);
                setShowAssignmentForm(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Assignment
            </button>
          </div>

          {showAssignmentForm && (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6">
              <h2 className="text-lg font-bold mb-4">{editingAssignment ? 'Edit Assignment' : 'Add New Assignment'}</h2>
              <form onSubmit={handleAssignmentSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input required type="text" value={assignmentFormData.title} onChange={e => setAssignmentFormData({...assignmentFormData, title: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <select required value={assignmentFormData.subjectId} onChange={e => setAssignmentFormData({...assignmentFormData, subjectId: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500">
                      <option value="" disabled>Select Subject</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={assignmentFormData.description} onChange={e => setAssignmentFormData({...assignmentFormData, description: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" rows={3}></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (Optional)</label>
                    <input type="date" value={assignmentFormData.dueDate} onChange={e => setAssignmentFormData({...assignmentFormData, dueDate: e.target.value})} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF)</label>
                    <input type="file" accept=".pdf" onChange={e => setAssignmentFile(e.target.files ? e.target.files[0] : null)} className="w-full border-gray-300 rounded-lg p-2 border focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowAssignmentForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">{loading ? 'Saving...' : 'Save Assignment'}</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto hide-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map(assignment => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assignment.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{assignment.subject?.name} (Sem {assignment.subject?.semester})</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.dueDate ? format(new Date(assignment.dueDate), 'PP') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => {
                        setEditingAssignment(assignment);
                        setAssignmentFormData({
                          title: assignment.title,
                          subjectId: assignment.subject?.id.toString(),
                          description: assignment.description || '',
                          dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().slice(0,10) : ''
                        });
                        setShowAssignmentForm(true);
                      }} className="text-indigo-600 hover:text-indigo-900 mr-4"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteAssignment(assignment.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {u.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
