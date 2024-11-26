import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd());
  
  return {
    plugins: [
      react({
        jsxRuntime: 'automatic',
        jsxImportSource: 'react',
        babel: {
          presets: [
            ['@babel/preset-react', {
              runtime: 'automatic'
            }]
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx']
    },
    esbuild: {
      loader: 'tsx',
      include: /src\/.*\.[tj]sx?$/,
      exclude: []
    },
    // Add environment-specific configurations
    define: {
      __APP_ENV__: JSON.stringify(env.VITE_APP_ENV),
    },
    server: {
      port: 5173,
      host: true,
    },
    build: {
      sourcemap: mode === 'development',
      minify: mode === 'production',
    }
  }
});