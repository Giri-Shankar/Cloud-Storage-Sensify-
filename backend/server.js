// backend/server.js
import express from 'express';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const upload = multer({ storage: multer.memoryStorage() });

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Get all files - FIXED
app.get('/api/files', async (req, res) => {
    try {
        console.log('Fetching files from Cloudinary...');
        
        // Use resource_type instead of expression
        const result = await cloudinary.search
            .expression('resource_type:image OR resource_type:video OR resource_type:raw')
            .sort_by('created_at', 'desc')
            .max_results(500)
            .execute();
        
        console.log(`Found ${result.resources.length} files`);
        
        const files = result.resources.map(resource => ({
            public_id: resource.public_id,
            format: resource.format,
            resource_type: resource.resource_type,
            bytes: resource.bytes,
            created_at: resource.created_at,
            secure_url: resource.secure_url,
            url: resource.url,
            original_filename: resource.original_filename || resource.public_id,
            width: resource.width,
            height: resource.height,
            folder: resource.folder
        }));
        
        res.json(files);
    } catch (error) {
        console.error('Cloudinary fetch error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.error || {}
        });
    }
});

// Alternative: Use API to list resources by type
// app.get('/api/files/alternative', async (req, res) => {
//     try {
//         console.log('Fetching all resources...');
        
//         const allFiles = [];
        
//         // Fetch images
//         const images = await cloudinary.api.resources({ 
//             resource_type: 'image',
//             max_results: 500 
//         });
//         allFiles.push(...images.resources);
        
//         // Fetch raw files (PDFs, CSVs, etc.)
//         const rawFiles = await cloudinary.api.resources({ 
//             resource_type: 'raw',
//             max_results: 500 
//         });
//         allFiles.push(...rawFiles.resources);
        
//         // Fetch videos if you have any
//         const videos = await cloudinary.api.resources({ 
//             resource_type: 'video',
//             max_results: 500 
//         });
//         allFiles.push(...videos.resources);
        
//         console.log(`Found ${allFiles.length} total files`);
        
//         const files = allFiles.map(resource => ({
//             public_id: resource.public_id,
//             format: resource.format,
//             resource_type: resource.resource_type,
//             bytes: resource.bytes,
//             created_at: resource.created_at,
//             secure_url: resource.secure_url,
//             url: resource.url,
//             original_filename: resource.public_id,
//             width: resource.width,
//             height: resource.height,
//             folder: resource.folder
//         }));
        
//         res.json(files);
//     } catch (error) {
//         console.error('Cloudinary API error:', error);
//         res.status(500).json({ 
//             error: error.message,
//             details: error.error || {}
//         });
//     }
// });

// Upload file
app.post('/api/files', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicId = req.body.publicId || req.file.originalname.split('.')[0];
        const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        
        console.log('Uploading file:', publicId);
        
        const result = await cloudinary.uploader.upload(base64File, {
            public_id: publicId,
            resource_type: 'auto'
        });
        
        console.log('Upload successful:', result.public_id);
        res.json(result);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rename file
// Rename file - IMPROVED
app.put('/api/files/:id/rename', async (req, res) => {
    try {
        const { newName, resourceType } = req.body;
        const oldPublicId = decodeURIComponent(req.params.id);
        
        // Remove file extension from newName if present
        const newPublicId = newName.replace(/\.[^/.]+$/, '');
        
        console.log(`Renaming "${oldPublicId}" to "${newPublicId}" (type: ${resourceType})`);
        
        const result = await cloudinary.uploader.rename(
            oldPublicId,
            newPublicId,
            { 
                resource_type: resourceType || 'raw',
                invalidate: true,
                overwrite: false
            }
        );
        
        console.log('Rename successful:', result);
        
        // Return the updated resource info
        res.json({
            public_id: result.public_id,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            created_at: result.created_at,
            secure_url: result.secure_url,
            url: result.url,
            original_filename: newPublicId,
            width: result.width,
            height: result.height
        });
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ 
            error: error.message,
            details: error.error || {}
        });
    }
});

// Delete file
app.delete('/api/files/:id', async (req, res) => {
    try {
        const { resourceType } = req.query;
        console.log(`Deleting ${req.params.id} (type: ${resourceType})`);
        
        const result = await cloudinary.uploader.destroy(req.params.id, {
            resource_type: resourceType || 'raw',
            invalidate: true
        });
        
        console.log('Delete result:', result);
        res.json(result);
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3001, () => {
    console.log('Backend running on https://cloud-storage-sensify-backend.onrender.com');
    console.log('Cloudinary cloud:', process.env.CLOUD_NAME);
});
