import { mergeConfig, type UserConfig } from 'vite';

// Code monté depuis Windows dans Docker : pas d'événements de fichiers, le serveur Vite de l'admin doit scruter.
export default (config: UserConfig) =>
  mergeConfig(config, {
    server: process.env.CHOKIDAR_USEPOLLING === 'true' ? { watch: { usePolling: true, interval: 500 } } : {},
  });
