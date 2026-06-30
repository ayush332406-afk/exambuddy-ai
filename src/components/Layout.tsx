import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../lib/firebase';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X,
  User as UserIcon,
  GraduationCap,
  BrainCircuit,
  Calendar,
  BarChart3,
  Settings,
  Moon,
  Sun,
  ClipboardList
} from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Start real-time Firestore sync
  useRealtimeSync();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Notes', href: '/notes', icon: BookOpen },
    { name: 'Previous Papers', href: '/papers', icon: FileText },
    { name: 'Assignments', href: '/assignments', icon: ClipboardList },
  ];

  if (user) {
    navigation.push(
      { name: 'Quizzes', href: '/quizzes', icon: BrainCircuit },
      { name: 'Study Planner', href: '/planner', icon: Calendar },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 }
    );
  }

  const isAdminEmail = user?.email?.trim().toLowerCase() === 'ayush332406@gmail.com';

  if (userProfile?.role === 'admin' || isAdminEmail) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Settings });
  }

  const handleLogout = async () => {
    await auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      {/* Sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <GraduationCap className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-2" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">BCA ExamBuddy</span>
            {userProfile?.role === 'admin' || isAdminEmail ? (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                Admin
              </span>
            ) : userProfile?.role === 'student' ? (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Student
              </span>
            ) : null}
          </div>
          <div className="flex-1 flex flex-col">
            <nav className="flex-1 px-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                    } group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors`}
                  >
                    <item.icon
                      className={`${
                        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      } flex-shrink-0 mr-3 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-slate-700 p-4">
            {user ? (
              <div className="flex flex-col w-full gap-3">
                <div className="flex items-center w-full">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                    <UserIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                      {user.displayName || 'Student'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="ml-2 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                >
                  {theme === 'light' ? (
                    <>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark Mode
                    </>
                  ) : (
                    <>
                      <Sun className="h-4 w-4 mr-2" />
                      Light Mode
                    </>
                  )}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center">
          <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">BCA ExamBuddy</span>
          {userProfile?.role === 'admin' || isAdminEmail ? (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
              Admin
            </span>
          ) : userProfile?.role === 'student' ? (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Student
            </span>
          ) : null}
        </div>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div 
            className="fixed inset-0 bg-gray-600 dark:bg-slate-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white dark:bg-slate-800">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white dark:focus:ring-slate-700"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-shrink-0 flex items-center px-4 mb-5">
              <GraduationCap className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-2" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">BCA ExamBuddy</span>
              {userProfile?.role === 'admin' || isAdminEmail ? (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                  Admin
                </span>
              ) : userProfile?.role === 'student' ? (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Student
                </span>
              ) : null}
            </div>
            <div className="mt-5 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                      } group flex items-center px-3 py-2 text-base font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                        } flex-shrink-0 mr-4 h-6 w-6`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-slate-700 p-4">
              {user ? (
                <div className="flex flex-col w-full gap-3">
                  <div className="flex items-center w-full">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                      <UserIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-700 dark:text-gray-200 truncate">
                        {user.displayName || 'Student'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="ml-2 flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <LogOut className="h-6 w-6" />
                    </button>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-5 w-5 mr-2" />
                        Dark Mode
                      </>
                    ) : (
                      <>
                        <Sun className="h-5 w-5 mr-2" />
                        Light Mode
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64 pt-14 md:pt-0 min-h-screen w-full max-w-full overflow-x-hidden">
        <main className="flex-1 focus:outline-none p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
