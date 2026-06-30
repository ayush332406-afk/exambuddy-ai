import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Download, FileText, Plus, Upload, X, Trash2
} from 'lucide-react';
import useSWR, { mutate } from 'swr';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
}

interface Paper {
  id: number;
  title: string;
  year: number;
  description?: string;
  fileUrl: string;
  createdAt: string;
  subject: Subject;
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);

export default function Papers() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const { data: papers = [], isLoading: loadingPapers } = useSWR<Paper[]>('/api/papers', fetcher);
  const { data: subjects = [], isLoading: loadingSubjects } = useSWR<Subject[]>('/api/subjects', fetcher);
  const loading = loadingPapers || loadingSubjects;
  
  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Admin Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [uploadYear, setUploadYear] = useState<string>(new Date().getFullYear().toString());
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadSubjectId || !uploadYear || !user) return;
    if (!editingPaper && !uploadFile) return;
    
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
      formData.append('year', uploadYear);
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
          setEditingPaper(null);
          setUploadTitle(''); 
          setUploadSubjectId(''); 
          setUploadYear(new Date().getFullYear().toString());
          setUploadDescription('');
          setUploadFile(null);
          setUploadProgress(0);
          mutate('/api/papers');
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
      
      const method = editingPaper ? 'PUT' : 'POST';
      const url = editingPaper ? `/api/papers/${editingPaper.id}` : '/api/papers';
      
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
    if (!window.confirm('Are you sure you want to delete this paper?')) return;
    try {
      const token = await user!.getIdToken();
      await fetch(`/api/papers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      mutate('/api/papers');
    } catch (e) { console.error(e); }
  };

  const filteredPapers = papers.filter(paper => {
    const matchesSearch = paper.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          paper.subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || paper.subject.semester.toString() === selectedSemester;
    const matchesSubject = selectedSubject === 'all' || paper.subject.id.toString() === selectedSubject;
    const matchesYear = selectedYear === 'all' || paper.year.toString() === selectedYear;
    return matchesSearch && matchesSemester && matchesSubject && matchesYear;
  });

  // Get unique years from papers for the year filter
  const uniqueYears = Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Previous Year Papers</h1>
          <p className="mt-1 text-sm text-gray-500">Access, download, and practice with past exam papers.</p>
        </div>
        {userProfile?.role === 'admin' && (
          <button
            onClick={() => {
              setEditingPaper(null);
              setUploadTitle('');
              setUploadSubjectId('');
              setUploadYear(new Date().getFullYear().toString());
              setUploadDescription('');
              setUploadFile(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Paper
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search papers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setSelectedSubject('all'); // Reset subject when semester changes
              }}
              className="block min-w-[140px] rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Semesters</option>
              <option value="1">Semester 1</option>
              <option value="2">Semester 2</option>
            </select>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="block min-w-[140px] rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Subjects</option>
              {subjects
                .filter(s => selectedSemester === 'all' || s.semester.toString() === selectedSemester)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block min-w-[120px] rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Years</option>
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Papers Table */}
        <div className="overflow-x-auto hide-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year & Sem</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    Loading papers...
                  </td>
                </tr>
              ) : filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    No previous papers found.
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-green-500 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{paper.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{paper.subject.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {paper.year}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Sem {paper.subject.semester}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            if (!user) {
                              navigate('/login');
                              return;
                            }
                            window.open(paper.fileUrl, '_blank');
                          }}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        {userProfile?.role === 'admin' && (
                          <>
                            <button 
                              onClick={() => {
                                setEditingPaper(paper);
                                setUploadTitle(paper.title);
                                setUploadSubjectId(paper.subject.id.toString());
                                setUploadYear(paper.year.toString());
                                setUploadDescription(paper.description || '');
                                setUploadFile(null);
                                setIsUploadModalOpen(true);
                              }}
                              className="text-gray-400 hover:text-green-500 transition-colors"
                              title="Edit Paper"
                            >
                              <FileText className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(paper.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete Paper"
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

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">{editingPaper ? 'Edit Paper' : 'Upload Paper'}</h3>
              <button 
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
              {uploadError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {uploadError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    required
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="" disabled>Select subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="number"
                    required
                    min="2000"
                    max="2099"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File (Max 25MB) {editingPaper && "(Optional)"}</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 transition-colors bg-gray-50">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input 
                          type="file" 
                          className="sr-only" 
                          accept="application/pdf"
                          required={!editingPaper}
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
                  {uploadProgress > 0 && uploadProgress < 100 ? `Uploading... ${uploadProgress}%` : 'Save Paper'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
