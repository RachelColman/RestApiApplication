const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cognito details
const REGION = 'eu-north-1';
const USER_POOL_ID = 'eu-north-1_eBjV6MuY2';
const JWKS_URI = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

// Set up jwks client for JWT verification
const client = jwksClient({
    jwksUri: JWKS_URI,
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

// Middleware to check JWT
function checkAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'No credentials sent!' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

app.post('/deploy', checkAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const formData = new FormData();
        formData.append('deployment-name', 'Local BPMN Deployment');
        formData.append('file', req.file.buffer, req.file.originalname);

        const response = await axios.post('http://localhost:8080/engine-rest/deployment/create', formData, {
            headers: formData.getHeaders(),
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = app;

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
