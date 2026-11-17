import { FastifyInstance } from 'fastify';
import { Config } from './config.js';
import { IAppRepository } from './db/repository.interface.js';
export declare function buildApp(config: Config, repo: IAppRepository): Promise<FastifyInstance>;
//# sourceMappingURL=app.d.ts.map