const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer setup
const upload = multer({ storage: multer.memoryStorage() });

// Azure Blob setup
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AUDIO_CONTAINER_NAME);

// ✅ Upload Audio
app.post(['/upload', '/audios/upload'], upload.single('file'), async(req, res) => {
    if (!req.file) {
        return res.status(400).send('⚠️ No file uploaded');
    }

    try {
        const blobName = `${Date.now()}-${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });

        console.log(`✅ Uploaded "${req.file.originalname}" to Azure Blob`);

        res.redirect('/audios');
    } catch (err) {
        console.error('❌ Upload error:', err.message);
        res.status(500).send('❌ Upload to Azure Blob failed');
    }
});

// ✅ Root route → redirect to /audios
app.get('/', (req, res) => {
    res.redirect('/audios');
});

// ✅ Audios page
app.get('/audios', async(req, res) => {
    try {
        let audioUrls = [];
        for await (const blob of containerClient.listBlobsFlat()) {
            audioUrls.push(containerClient.getBlockBlobClient(blob.name).url);
        }

        res.render('index', { audios: audioUrls });
    } catch (err) {
        console.error('❌ Error listing audios:', err.message);
        res.status(500).send('❌ Failed to fetch audios');
    }
});

// ✅ Health check
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
});