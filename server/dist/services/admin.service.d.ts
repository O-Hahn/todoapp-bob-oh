import { IAppRepository } from '../db/repository.interface.js';
import { Config } from '../config.js';
import { AdminStatsResponse } from '../types/index.js';
export declare class AdminService {
    private repo;
    private config;
    constructor(repo: IAppRepository, config: Config);
    bootstrapAdmin(): Promise<void>;
    private deliverAdminPassword;
    private createK8sSecret;
    getStats(): Promise<AdminStatsResponse>;
}
//# sourceMappingURL=admin.service.d.ts.map