/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Papers from './pages/Papers';
import Assignments from './pages/Assignments';
import Quizzes from './pages/Quizzes';
import Planner from './pages/Planner';
import Analytics from './pages/Analytics';
import Admin from './pages/Admin';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <Layout>
                <Dashboard />
              </Layout>
            } 
          />
          <Route 
            path="/notes" 
            element={
              <Layout>
                <Notes />
              </Layout>
            } 
          />
          {/* Papers module placeholder */}
          <Route 
            path="/papers" 
            element={
              <Layout>
                <Papers />
              </Layout>
            } 
          />
          <Route 
            path="/assignments" 
            element={
              <Layout>
                <Assignments />
              </Layout>
            } 
          />
          {/* Quizzes module placeholder */}
          <Route 
            path="/quizzes" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Quizzes />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/planner" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Planner />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Analytics />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
