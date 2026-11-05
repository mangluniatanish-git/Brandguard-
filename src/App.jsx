import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandProvider } from './context/BrandContext';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BrandLibrary from './pages/BrandLibrary';
import NewContent from './pages/NewContent';
import MyContent from './pages/MyContent';
import ReviewScreen from './pages/ReviewScreen';
import ReviewQueue from './pages/ReviewQueue';
import Insights from './pages/Insights';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandProvider>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Authenticated Layout Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route
                path="new-content"
                element={
                  <ProtectedRoute allowedRoles={['creator', 'admin']}>
                    <NewContent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="my-content"
                element={
                  <ProtectedRoute allowedRoles={['creator', 'admin']}>
                    <MyContent />
                  </ProtectedRoute>
                }
              />
              <Route
                path="review-queue"
                element={
                  <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
                    <ReviewQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="review"
                element={<ReviewScreen />}
              />
              <Route
                path="review/:id"
                element={<ReviewScreen />}
              />
              <Route
                path="insights"
                element={
                  <ProtectedRoute allowedRoles={['manager', 'admin']}>
                    <Insights />
                  </ProtectedRoute>
                }
              />
              <Route
                path="brand-library"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <BrandLibrary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrandProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
