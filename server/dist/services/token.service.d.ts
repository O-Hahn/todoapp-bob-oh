import { IAppRepository } from '../db/repository.interface.js';
import { AuthUser } from '../types/index.js';
export declare class TokenService {
    private repo;
    constructor(repo: IAppRepository);
    createToken(userId: string, label: string): Promise<{
        id: string;
        label: string;
        token: string;
        createdAt: string;
    }>;
    listTokens(userId: string): Promise<Array<{
        id: string;
        label: string;
        createdAt: string;
        lastUsedAt?: string;
    }>>;
    revokeToken(userId: string, id: string): Promise<void>;
    validateToken(rawToken: string): Promise<AuthUser | null>;
}
//# sourceMappingURL=token.service.d.ts.map