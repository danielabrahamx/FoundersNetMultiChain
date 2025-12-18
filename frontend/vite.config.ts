import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        root: './',
        publicDir: 'public',
        build: {
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                },
            },
        },
        server: {
            port: 5173,
            host: true,
            open: true,
            // Proxy API requests to backend during development
            proxy: {
                // Proxy API requests to Fastify backend
                '/api': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                // Proxy HTMX partial requests
                '/markets': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                '/market': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                '/balance': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                '/admin': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
                '/health': {
                    target: 'http://localhost:3000',
                    changeOrigin: true,
                    secure: false,
                },
            },
            // Watch for changes in template files (for HTMX development)
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        // Define environment variables available to the client
        define: {
            '__NETWORK__': JSON.stringify(env.VITE_NETWORK || 'localhost'),
            '__CHAIN_ID__': JSON.stringify(env.VITE_CHAIN_ID || '31337'),
            '__CONTRACT_ADDRESS__': JSON.stringify(env.VITE_CONTRACT_ADDRESS || ''),
            '__USDC_ADDRESS__': JSON.stringify(env.VITE_USDC_ADDRESS || ''),
            '__ADMIN_ADDRESS__': JSON.stringify(env.VITE_ADMIN_ADDRESS || ''),
        },
        // Optimize dependencies
        optimizeDeps: {
            include: ['viem', 'htmx.org'],
        },
    };
});
