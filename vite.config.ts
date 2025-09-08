import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Custom plugin to create a dev-only API endpoint for saving exclusions
const devServerEndpoints = (): Plugin => ({
  name: 'dev-server-endpoints',
  configureServer(server) {
    server.middlewares.use('/api/update-exclusions', (req, res, next) => {
      if (req.method !== 'POST') {
        return next();
      }

      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!Array.isArray(data)) {
            throw new Error('Invalid data format. Expected an array of skill IDs.');
          }
          const filePath = path.resolve(process.cwd(), 'src/data/skill-exclusions.json');
          
          // Sort for consistency and pretty-print
          const sortedData = data.sort();
          const jsonString = JSON.stringify(sortedData, null, 2);

          fs.writeFileSync(filePath, jsonString + '\n');
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Exclusions updated successfully.' }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: `Error updating exclusions: ${message}` }));
        }
      });
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
        react(), 
        tailwindcss(),
        mode === 'development' ? devServerEndpoints() : undefined,
    ].filter(Boolean),
    base: "/uma-parent-tracker/",
  }
})