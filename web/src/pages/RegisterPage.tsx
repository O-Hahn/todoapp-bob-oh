import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  InlineNotification,
  Tile,
} from '@carbon/react';
import { UserFollow } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await register(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
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
              <h2 className="auth-title">
                Create Account
              </h2>
              <p className="page-subtitle">
                Self-service registration for your personal ToDo workspace
              </p>
            </div>

            {error && (
              <InlineNotification
                kind="error"
                title="Registration Error"
                subtitle={error}
                hideCloseButton
                lowContrast
              />
            )}

            <TextInput
              id="reg-email"
              labelText="Email Address"
              placeholder="user@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <PasswordInput
              id="reg-password"
              labelText="Password (min 8 chars)"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <PasswordInput
              id="reg-confirm-password"
              labelText="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              renderIcon={UserFollow}
              disabled={loading}
              className="btn-full"
            >
              {loading ? 'Creating Account...' : 'Register'}
            </Button>

            <div className="auth-footer">
              Already have an account?{' '}
              <Link to="/login" className="link-primary">
                Sign In
              </Link>
            </div>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
};
