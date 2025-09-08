import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
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
        let fileStream: NodeJS.ReadableStream | null = null;
        let originalFilename = '';

        busboy.on('field', (fieldname, val) => {
            if (fieldname === 'umaId') {
                umaId = val;
            }
        });

        busboy.on('file', (fieldname, file, { filename }) => {
            if (fieldname === 'image') {
                fileStream = file;
                originalFilename = filename;
            }
        });

        busboy.on('finish', () => {
            if (!umaId || !fileStream) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'Missing umaId or image file.' }));
            }

            const extension = path.extname(originalFilename) || '.png';
            const saveTo = path.join(process.cwd(), 'public/images/umas', `${umaId}${extension}`);
            
            fs.mkdirSync(path.dirname(saveTo), { recursive: true });
            
            const writeStream = fs.createWriteStream(saveTo);
            fileStream.pipe(writeStream);

            writeStream.on('finish', () => {
                console.log(`Successfully saved image for umaId ${umaId} to ${saveTo}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Image for ${umaId} uploaded. Run prepare_data.py to apply.` }));
            });

            writeStream.on('error', (err) => {
                console.error('Error writing file:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: `Server error while saving file: ${err.message}` }));
            });
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
        mode === 'development' ? devServerEndpoints() : undefined,
    ].filter(Boolean),
    base: "/uma-parent-tracker/",
  }
})