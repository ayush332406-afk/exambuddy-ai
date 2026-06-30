import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Download, BrainCircuit, FileText, Plus, Upload, X, Trash2
} from 'lucide-react';
import AIModal from '../components/AIModal';
import useSWR, { mutate } from 'swr';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
}

interface Note {
  id: number;
  title: string;
  description?: string;
  fileUrl: string;
  createdAt: string;
  subject: Subject;
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);

export default function Notes() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const { data: notes = [], isLoading: loadingNotes } = useSWR<Note[]>('/api/notes', fetcher);
  const { data: subjects = [], isLoading: loadingSubjects } = useSWR<Subject[]>('/api/subjects', fetcher);
  const loading = loadingNotes || loadingSubjects;
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  
  // AI Modal state
  const [activeAINote, setActiveAINote] = useState<Note | null>(null);

  // Admin Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadSubjectId || !user) return;
    if (!editingNote && !uploadFile) return;
    
    if (uploadFile && uploadFile.size > 25 * 1024 * 1024) {
      setUploadError("File size exceeds the 25MB limit.");
      return;
    }
    
    setUploadError(null);
    setUploadProgress(0);

    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('subjectId', uploadSubjectId);
      formData.append('description', uploadDescription);
      if (uploadFile) {
        formData.append('file', uploadFile);
      }

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setIsUploadModalOpen(false);
          setEditingNote(null);
          setUploadTitle(''); 
          setUploadSubjectId(''); 
          setUploadDescription('');
          setUploadFile(null);
          setUploadProgress(0);
          mutate('/api/notes');
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            setUploadError(res.error || 'Upload failed');
          } catch (err) {
            setUploadError('Upload failed');
          }
          setUploadProgress(0);
        }
      });
      xhr.addEventListener('error', () => {
        setUploadError('Network error occurred during upload.');
        setUploadProgress(0);
      });
      
      const method = editingNote ? 'PUT' : 'POST';
      const url = editingNote ? `/api/notes/${editingNote.id}` : '/api/notes';
      
      xhr.open(method, url);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    } catch (e) {
      console.error(e);
      setUploadError('An unexpected error occurred.');
      setUploadProgress(0);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      const token = await user!.getIdToken();
      await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mutate('/api/notes');
    } catch (e) { console.error(e); }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          note.subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || note.subject.semester.toString() === selectedSemester;
    const matchesSubject = selectedSubject === 'all' || note.subject.id.toString() === selectedSubject;
    return matchesSearch && matchesSemester && matchesSubject;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Notes Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Access, organize, and generate quizzes from your study material.</p>
        </div>
        {userProfile?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingNote(null);
              setUploadTitle('');
              setUploadSubjectId('');
              setUploadDescription('');
              setUploadFile(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Note
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 transition-colors">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </div>
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedSubject('all'); // Reset subject when semester changes
              }}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            >
              <option value="all">All Subjects</option>
              {subjects
                .filter(s => selectedSemester === 'all' || s.semester.toString() === selectedSemester)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notes Table */}
        <div className="overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700 transition-colors">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading notes...
                  </td>
                </tr>
              ) : filteredNotes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    No notes found. Try changing filters.
                  </td>
                </tr>
              ) : (
                filteredNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-indigo-500 dark:text-indigo-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{note.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600 dark:text-gray-300">{note.subject.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        Sem {note.subject.semester}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            if (!user) {
                              navigate('/login');
                              return;
                            }
                            window.open(note.fileUrl, '_blank');
                          }}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => {
                            if (!user) {
                              navigate('/login');
                              return;
                            }
                            setActiveAINote(note);
                          }}
                          className="text-gray-400 hover:text-orange-500 transition-colors"
                          title="Generate Insights"
                        >
                          <BrainCircuit className="h-5 w-5" />
                        </button>
                        {userProfile?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingNote(note);
                                setUploadTitle(note.title);
                                setUploadSubjectId(note.subject.id.toString());
                                setUploadDescription(note.description || '');
                                setUploadFile(null);
                                setIsUploadModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-green-500 transition-colors"
                              title="Edit Note"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(note.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Note"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* AI Modal */}
      {activeAINote && (
        <AIModal 
          noteId={activeAINote.id} 
          noteTitle={activeAINote.title}
          onClose={() => setActiveAINote(null)} 
        />
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-colors">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-700/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editingNote ? 'Edit Note' : 'Upload Note'}</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white rounded-full p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              {uploadError && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm">
                  {uploadError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <select
                  required
                  value={uploadSubjectId}
                  onChange={(e) => setUploadSubjectId(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                >
                  <option value="" disabled>Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PDF File (Max 25MB) {editingNote && "(Optional)"}</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-lg hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors bg-gray-50 dark:bg-slate-700/50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <div className="flex text-sm text-gray-600 dark:text-gray-400 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="application/pdf"
                          required={!editingNote}
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      {uploadFile ? uploadFile.name : 'PDF up to 25MB'}
                    </p>
                  </div>
                </div>
              </div>

              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors"
                >
                  {uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
