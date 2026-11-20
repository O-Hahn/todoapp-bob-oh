import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Modal,
  TextInput,
  Tile,
  InlineNotification,
  DataTableSkeleton,
  CodeSnippet,
  Stack,
  Tag,
} from '@carbon/react';
import {
  Add,
  TrashCan,
  Copy,
  Password,
  Checkmark,
  Bot,
} from '@carbon/icons-react';
import { useAuth } from '../context/AuthContext.js';
import { ApiTokenItem, CreatedApiToken } from '../types/index.js';
import {
  fetchApiTokens,
  createApiToken,
  revokeApiToken,
} from '../api/tokenApi.js';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tokens, setTokens] = useState<ApiTokenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tokenLabel, setTokenLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Newly Created Token Display Modal
  const [createdToken, setCreatedToken] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  // Revoke target
  const [revokeTarget, setRevokeTarget] = useState<ApiTokenItem | null>(null);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const loadTokens = async () => {
    try {
      setError(null);
      const data = await fetchApiTokens();
      setTokens(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load API tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTokens();
  }, []);

  const handleCreateToken = async () => {
    if (!tokenLabel.trim()) {
      setCreateError('Token label is required');
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const newToken = await createApiToken(tokenLabel);
      setTokens((prev) => [newToken, ...prev]);
      setCreatedToken(newToken);
      setIsModalOpen(false);
      setTokenLabel('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to generate token');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const openRevokeModal = (token: ApiTokenItem) => {
    setRevokeTarget(token);
    setIsRevokeModalOpen(true);
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await revokeApiToken(revokeTarget.id);
      setTokens((prev) => prev.filter((t) => t.id !== revokeTarget.id));
      setIsRevokeModalOpen(false);
      setRevokeTarget(null);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke token');
    } finally {
      setRevoking(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app-content">
      <Stack gap={7}>
        <div>
          <h1 className="page-title">
            Settings &amp; Agent Tokens
          </h1>
          <p className="page-subtitle">
            Manage your account security and MCP tokens for watsonx Orchestrate AI agents
          </p>
        </div>

        {error && (
          <InlineNotification
            kind="error"
            title="Error"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
          />
        )}

        {/* Profile Card */}
        <Tile>
          <div
            className="row-between"
          >
            <div>
              <h3 className="section-title-lg">
                Account Profile
              </h3>
              <p className="page-subtitle">
                Signed in as <strong>{user?.email}</strong> · Role:{' '}
                <Tag type={user?.role === 'admin' ? 'purple' : 'blue'}>
                  {user?.role}
                </Tag>
              </p>
            </div>

            <Button
              kind="tertiary"
              renderIcon={Password}
              onClick={() => navigate('/change-password')}
              className="touch-target"
            >
              Change Password
            </Button>
          </div>
        </Tile>

        {/* API Tokens Section */}
        <div>
          <div
            className="row-between mb-4"
          >
            <div>
              <h2 className="section-title-xl">
                MCP API Tokens
              </h2>
              <p className="page-subtitle">
                Tokens grant your personal watsonx Orchestrate agent remote access to your tasks
              </p>
            </div>

            <Button
              renderIcon={Add}
              onClick={() => {
                setTokenLabel('');
                setCreateError(null);
                setIsModalOpen(true);
              }}
              className="touch-target"
            >
              Generate New Token
            </Button>
          </div>

          {loading ? (
            <DataTableSkeleton headers={[{ key: 'l', header: 'Tokens' }]} />
          ) : tokens.length === 0 ? (
            <Tile className="empty-tile empty-tile--md">
              <Bot size={40} className="icon-secondary" />
              <h4 className="empty-title empty-title--md">
                No API tokens generated yet
              </h4>
              <p className="empty-text empty-text--md">
                Generate a token to let your watsonx Orchestrate agent list, create, and manage your todos.
              </p>
              <Button
                renderIcon={Add}
                onClick={() => {
                  setTokenLabel('');
                  setIsModalOpen(true);
                }}
              >
                Generate Token
              </Button>
            </Tile>
          ) : (
            <Stack gap={4}>
              {tokens.map((token) => (
                <Tile key={token.id}>
                  <div
                    className="row-between"
                  >
                    <div>
                      <div className="token-label">
                        {token.label}
                      </div>
                      <div
                        className="meta-text"
                      >
                        Created: {formatDate(token.createdAt)} · Last Used:{' '}
                        {formatDate(token.lastUsedAt)}
                      </div>
                    </div>

                    <Button
                      kind="danger--ghost"
                      size="sm"
                      renderIcon={TrashCan}
                      onClick={() => openRevokeModal(token)}
                      className="touch-target"
                    >
                      Revoke
                    </Button>
                  </div>
                </Tile>
              ))}
            </Stack>
          )}
        </div>

        {/* Integration Instructions */}
        <Tile className="bg-layer">
          <h3 className="section-title-md">
            How to Connect watsonx Orchestrate
          </h3>
          <p className="help-text help-text--mb">
            Configure your remote MCP toolkit in watsonx Orchestrate using the Streamable HTTP endpoint:
          </p>
          <CodeSnippet type="multi" feedback="Copied configuration snippet">
{`# watsonx Orchestrate Remote MCP Toolkit configuration
kind: mcp
transport: streamable_http
server_url: https://<your-openshift-route-host>/mcp
tools:
  - "*"
headers:
  Authorization: "Bearer <your-api-token>"`}
          </CodeSnippet>
        </Tile>
      </Stack>

      {/* Generate Token Modal */}
      <Modal
        open={isModalOpen}
        modalHeading="Generate API Token"
        primaryButtonText={creating ? 'Generating...' : 'Generate Token'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={creating}
        onRequestClose={() => setIsModalOpen(false)}
        onRequestSubmit={handleCreateToken}
      >
        <div className="modal-body-stack">
          <p className="help-text">
            Enter a descriptive label for where this token will be used (e.g. &quot;watsonx Orchestrate SaaS Agent&quot;).
          </p>

          {createError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={createError}
              hideCloseButton
              lowContrast
            />
          )}

          <TextInput
            id="token-label"
            labelText="Token Label *"
            placeholder="e.g. watsonx Orchestrate Production Agent"
            value={tokenLabel}
            onChange={(e) => setTokenLabel(e.target.value)}
            required
            autoFocus
          />
        </div>
      </Modal>

      {/* One-Time Token Display Modal */}
      <Modal
        open={!!createdToken}
        modalHeading="API Token Generated"
        primaryButtonText="Done"
        onRequestClose={() => setCreatedToken(null)}
        onRequestSubmit={() => setCreatedToken(null)}
      >
        <div className="modal-body-stack">
          <InlineNotification
            kind="warning"
            title="Copy your token now"
            subtitle="For security reasons, this token will never be displayed again. Store it securely in your watsonx Orchestrate connection."
            hideCloseButton
            lowContrast
          />

          <div>
            <div className="field-label">
              Label: {createdToken?.label}
            </div>
            <CodeSnippet type="single" feedback="Copied!">
              {createdToken?.token || ''}
            </CodeSnippet>
          </div>

          <Button
            kind="primary"
            renderIcon={copied ? Checkmark : Copy}
            onClick={() => createdToken && copyToClipboard(createdToken.token)}
            className="mt-2"
          >
            {copied ? 'Copied to Clipboard!' : 'Copy Token'}
          </Button>
        </div>
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        danger
        open={isRevokeModalOpen}
        modalHeading="Revoke API Token"
        primaryButtonText={revoking ? 'Revoking...' : 'Revoke Token'}
        secondaryButtonText="Cancel"
        primaryButtonDisabled={revoking}
        onRequestClose={() => setIsRevokeModalOpen(false)}
        onRequestSubmit={confirmRevoke}
      >
        <p className="pt-4">
          Are you sure you want to revoke the token <strong>&quot;{revokeTarget?.label}&quot;</strong>? Any agents or tools currently using this token will lose access immediately.
        </p>
      </Modal>
    </div>
  );
};
