import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Download, FileText, Search, Filter } from 'lucide-react';
import useSWR from 'swr';

interface Subject {
  id: number;
  name: string;
  code: string;
  semester: number;
}

interface Assignment {
  id: number;
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  dueDate: string | null;
  createdAt: string;
  subject: Subject;
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : []);

export default function Assignments() {
  const { user } = useAuth();
  
  const { data: assignments = [], isLoading: loading, error } = useSWR<Assignment[]>('/api/assignments', fetcher);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');

  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          assignment.subject.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || assignment.subject.semester === selectedSemester;
    return matchesSearch && matchesSemester;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'Assignment.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
          <p className="text-gray-600 dark:text-gray-300">View and download your subject assignments</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Semesters</option>
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
            <option value={3}>Semester 3</option>
            <option value={4}>Semester 4</option>
            <option value={5}>Semester 5</option>
            <option value={6}>Semester 6</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl">
          {error}
        </div>
      )}

      {filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No assignments found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || selectedSemester !== 'all' ? 'Try adjusting your filters' : 'Check back later for new assignments'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredAssignments.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 flex flex-col transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      Sem {assignment.subject.semester}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {assignment.subject.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                    {assignment.title}
                  </h3>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1">
                    {assignment.subject.name}
                  </p>
                </div>
                <div className="flex-shrink-0 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 text-rose-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase">
                    PDF
                  </span>
                </div>
              </div>

              {assignment.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {assignment.description}
                </p>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                  <span>Uploaded: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                  {assignment.dueDate && (
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <span>{formatFileSize(assignment.fileSize)}</span>
                </div>
                <button
                  onClick={() => handleDownload(assignment.fileUrl, assignment.fileName)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
