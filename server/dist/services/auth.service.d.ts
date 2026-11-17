import { IAppRepository } from '../db/repository.interface.js';
import { AuthUser } from '../types/index.js';
export declare class AuthService {
    private repo;
    constructor(repo: IAppRepository);
    register(email: string, password: string): Promise<AuthUser>;
    login(email: string, password: string): Promise<{
        user: AuthUser;
        sessionToken: string;
    }>;
    validateSession(token: string): Promise<AuthUser | null>;
    logout(token: string): Promise<void>;
    changePassword(userId: string, currentPass: string, newPass: string): Promise<AuthUser>;
}
//# sourceMappingURL=auth.service.d.ts.map