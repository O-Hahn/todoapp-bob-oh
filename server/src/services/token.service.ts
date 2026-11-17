import { IAppRepository } from '../db/repository.interface.js';
import { ApiTokenDoc, AuthUser } from '../types/index.js';
import { generateToken, hashToken, getTokenDocId } from '../auth/crypto.js';

export class TokenService {
  constructor(private repo: IAppRepository) {}

  async createToken(
    userId: string,
    label: string,
  ): Promise<{ id: string; label: string; token: string; createdAt: string }> {
    const rawToken = `todo_mcp_${generateToken()}`;
    const tokenHash = hashToken(rawToken);
    const docId = getTokenDocId(rawToken);

    const doc: ApiTokenDoc = {
      _id: docId,
      userId,
      label: label.trim(),
      tokenHash,
      createdAt: new Date().toISOString(),
      revoked: false,
      type: 'api_token',
    };

    const saved = await this.repo.apiTokens.create(doc);

    return {
      id: saved._id,
      label: saved.label,
      token: rawToken,
      createdAt: saved.createdAt,
    };
  }

  async listTokens(
    userId: string,
  ): Promise<Array<{ id: string; label: string; createdAt: string; lastUsedAt?: string }>> {
    const tokens = await this.repo.apiTokens.listByUserId(userId);
    return tokens.map((t) => ({
      id: t._id,
      label: t.label,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
    }));
  }

  async revokeToken(userId: string, id: string): Promise<void> {
    const token = await this.repo.apiTokens.getById(id);
    if (!token || token.userId !== userId) {
      const err = new Error('API token not found') as any;
      err.statusCode = 404;
      throw err;
    }

    token.revoked = true;
    await this.repo.apiTokens.update(token);
  }

  async validateToken(rawToken: string): Promise<AuthUser | null> {
    if (!rawToken) return null;
    const docId = getTokenDocId(rawToken);
    const tokenDoc = await this.repo.apiTokens.getById(docId);

    if (!tokenDoc || tokenDoc.revoked) {
      return null;
    }

    // Update lastUsedAt asynchronously
    tokenDoc.lastUsedAt = new Date().toISOString();
    this.repo.apiTokens.update(tokenDoc).catch(() => {});

    const user = await this.repo.users.getById(tokenDoc.userId);
    if (!user) return null;

    return {
      id: user._id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
