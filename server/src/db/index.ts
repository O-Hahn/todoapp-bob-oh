import { Config, config } from '../config.js';
import { IAppRepository } from './repository.interface.js';
import { CloudantAppRepository, createCloudantClient } from './cloudant.repository.js';
import { MemoryAppRepository } from './memory.repository.js';

let appRepository: IAppRepository | null = null;

export function getRepository(cfg: Config = config): IAppRepository {
  if (!appRepository) {
    if (
      process.env.USE_MEMORY_DB === 'true' ||
      cfg.NODE_ENV === 'test' ||
      (!cfg.CLOUDANT_APIKEY && (!cfg.CLOUDANT_USERNAME || !cfg.CLOUDANT_PASSWORD))
    ) {
      appRepository = new MemoryAppRepository();
    } else {
      const client = createCloudantClient(cfg);
      appRepository = new CloudantAppRepository(client, cfg);
    }
  }
  return appRepository;
}

export function setRepository(repo: IAppRepository): void {
  appRepository = repo;
}
