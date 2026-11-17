import { config } from './config.js';
import { getRepository } from './db/index.js';
import { AdminService } from './services/admin.service.js';
import { buildApp } from './app.js';
async function main() {
    const repo = getRepository(config);
    // Initialize DB and bootstrap admin
    try {
        await repo.init();
        const adminService = new AdminService(repo, config);
        await adminService.bootstrapAdmin();
    }
    catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Database initialization or admin bootstrap failed: ${err.message}`);
        process.exit(1);
    }
    const app = await buildApp(config, repo);
    try {
        const address = await app.listen({
            port: config.PORT,
            host: config.HOST,
        });
        app.log.info(`Server listening on ${address}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
    const signals = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
        process.on(signal, async () => {
            app.log.info(`Received ${signal}, shutting down gracefully...`);
            await app.close();
            process.exit(0);
        });
    }
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(`Fatal startup error: ${err.message}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map