const express = require('express');
const multer = require('multer');
const { BlobServiceClient } = require('@azure/storage-blob');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set view engine to EJS and views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Multer setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Azure Upload Endpoint
app.post('/upload', upload.single('file'), async(req, res) => {
    console.log('📥 Upload route called!');

    if (!req.file) {
        console.log('⚠️ No file received!');
        return res.status(400).send('No file uploaded');
    }

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINER_NAME);

        const blobName = `${Date.now()}-${req.file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.uploadData(req.file.buffer, {
            blobHTTPHeaders: { blobContentType: req.file.mimetype }
        });

        console.log(`✅ Uploaded "${req.file.originalname}" to Azure Blob`);
        console.log('📂 Blob URL:', blockBlobClient.url);

        res.render('index', { message: `✅ Uploaded "${req.file.originalname}"`, blobUrl: blockBlobClient.url });
    } catch (err) {
        console.error('❌ Upload error:', err.message);
        res.status(500).send('❌ Upload to Azure Blob failed');
    }
});

// Render Upload Page
app.get('/', (req, res) => {
    res.render('index', { message: null, blobUrl: null });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Server started at http://localhost:${port}`);
});