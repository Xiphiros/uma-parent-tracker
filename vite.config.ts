import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { IncomingMessage, ServerResponse } from 'http';
import Busboy from 'busboy';

// Custom plugin to create a dev-only API endpoint for saving exclusions
const devServerEndpoints = (): Plugin => ({
  name: 'dev-server-endpoints',
  configureServer(server) {
    // Endpoint for skill exclusions
    server.middlewares.use('/api/update-exclusions', (req: IncomingMessage, res: ServerResponse, next) => {
      if (req.method !== 'POST') return next();
      let body = '';
      req.on('data', (chunk: any) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!Array.isArray(data)) throw new Error('Invalid data format. Expected an array of skill IDs.');
          
          const filePath = path.resolve(process.cwd(), 'src/data/skill-exclusions.json');
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

    // Endpoint for uma image uploads
    server.middlewares.use('/api/upload-uma-image', (req: IncomingMessage, res: ServerResponse, next) => {
        if (req.method !== 'POST') return next();

        const busboy = Busboy({ headers: req.headers });
        let umaId = '';
        const chunks: Buffer[] = [];
        let originalFilename = '';

        busboy.on('field', (fieldname: string, val: string) => {
            if (fieldname === 'umaId') {
                umaId = val;
            }
        });

        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, { filename }: { filename: string }) => {
            if (fieldname === 'image') {
                originalFilename = filename;
                file.on('data', (chunk) => {
                    chunks.push(chunk as Buffer);
                });
            }
        });

        busboy.on('finish', () => {
            if (!umaId || chunks.length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'Missing umaId or image file.' }));
            }
            
            try {
                const fileBuffer = Buffer.concat(chunks);
                const extension = path.extname(originalFilename) || '.png';
                const saveTo = path.join(process.cwd(), 'public/images/umas', `${umaId}${extension}`);
                
                fs.mkdirSync(path.dirname(saveTo), { recursive: true });
                fs.writeFileSync(saveTo, fileBuffer);

                console.log(`Successfully saved image for umaId ${umaId} to ${saveTo}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Image for ${umaId} uploaded. Run prepare_data.py to apply.` }));
            } catch (err) {
                console.error('Error writing file:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Server error while saving file: ${(err as Error).message}` }));
            }
        });

        req.pipe(busboy);
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
        react(), 
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
            manifest: {
                name: 'Umamusume Parent Tracker',
                short_name: 'UmaTracker',
                description: 'A point-based system for progressive parent farming.',
                theme_color: '#fafaf9',
                icons: [
                    {
                        src: 'icons/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icons/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                runtimeCaching: [
                    {
                        // Match any request that starts with /uma-parent-tracker/images/umas/
                        urlPattern: ({ url }) => url.pathname.startsWith('/uma-parent-tracker/images/umas/'),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'uma-image-cache',
                            expiration: {
                                maxEntries: 200, // Cache up to 200 images
                                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
                            },
                            cacheableResponse: {
                                statuses: [0, 200] // Cache opaque responses (for cross-origin requests if needed)
                            }
                        }
                    }
                ]
            }
        }),
        mode === 'development' ? devServerEndpoints() : undefined,
    ].filter(Boolean),
    base: "/uma-parent-tracker/",
  }
})