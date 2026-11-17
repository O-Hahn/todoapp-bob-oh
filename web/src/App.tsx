import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { AuthProvider } from './context/AuthContext.js';
import { AppHeader } from './components/AppHeader.js';
import { RouteGuard } from './components/RouteGuard.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ChangePasswordPage } from './pages/ChangePasswordPage.js';
import { TodosPage } from './pages/TodosPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AdminPage } from './pages/AdminPage.js';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="app-container">
            <AppHeader />
            <main style={{ marginTop: '48px', flex: 1 }}>
              <Routes>
                {/* Public Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Password Change Route */}
                <Route
                  path="/change-password"
                  element={
                    <RouteGuard>
                      <ChangePasswordPage />
                    </RouteGuard>
                  }
                />

                {/* Protected Application Routes */}
                <Route
                  path="/"
                  element={
                    <RouteGuard>
                      <TodosPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <RouteGuard>
                      <SettingsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <RouteGuard requireAdmin>
                      <AdminPage />
                    </RouteGuard>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};
