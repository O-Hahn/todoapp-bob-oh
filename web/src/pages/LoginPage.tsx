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
import { Login as LoginIcon } from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
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
                Welcome Back
              </h2>
              <p style={{ color: 'var(--cds-text-secondary)', marginTop: '0.25rem' }}>
                Sign in to manage your tasks and MCP agent workflows
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

            <TextInput
              id="email"
              labelText="Email Address"
              placeholder="user@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <PasswordInput
              id="password"
              labelText="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              renderIcon={LoginIcon}
              disabled={loading}
              style={{ width: '100%', maxWidth: 'none' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
              Don&apos;t have an account?{' '}
              <Link to="/register" style={{ color: 'var(--cds-link-primary)' }}>
                Create an account
              </Link>
            </div>
          </Stack>
        </Form>
      </Tile>
    </div>
  );
};
