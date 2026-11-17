import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Stack,
  PasswordInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { Password } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext.js';

export const ChangePasswordPage: React.FC = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <Tile className="auth-card">
        <Form onSubmit={handleSubmit}>
          <Stack gap={6}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600, margin: 0 }}>
                {user?.mustChangePassword
                  ? 'Initial Password Change Required'
                  : 'Change Password'}
              </h2>
              <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
                {user?.mustChangePassword
                  ? 'Please set a secure personal password to continue'
                  : 'Update your account password'}
              </p>
            </div>

            {error && (
              <InlineNotification
                kind="error"
                title="Error"
                subtitle={error}
                hideCloseButton
                lowContrast
              />
            )}

            {success && (
              <InlineNotification
                kind="success"
                title="Success"
                subtitle={success}
                hideCloseButton
                lowContrast
              />
            )}

            <PasswordInput
              id="current-password"
              labelText="Current Password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />

            <PasswordInput
              id="new-password"
              labelText="New Password (min 8 characters)"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <PasswordInput
              id="confirm-new-password"
              labelText="Confirm New Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              renderIcon={Password}
              disabled={loading}
              style={{ width: '100%', maxWidth: 'none' }}
            >
              {loading ? 'Updating Password...' : 'Change Password'}
            </Button>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
};
