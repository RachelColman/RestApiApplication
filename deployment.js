const express = require('express');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({storage});

const VALID_USERNAME = 'admin';
const VALID_PASSWORD = 'password';

function checkAuth(req, res, next) {
    const authHeader = req.headers['authorization'];

    if(!authHeader) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Deploy Area"');
        return res.status(401).json({error: 'No credentials sent!'});
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if(username === VALID_USERNAME && password === VALID_PASSWORD) {
        next();
    } else {
        return res.status(403).json({error: 'Invalid credentials'});
    }
}

app.post('/deploy', checkAuth, upload.single('file'), async (req, res) => {
    try {
        if(!req.file) {
            return res.status(400).json({error: 'No file uploaded'});
        }    

        const formData = new FormData;
        formData.append('deployment-name', 'Local BPMN Deployment');
        formData.append('file', req.file.buffer, req.file.originalname);

        const response = await axios.post('http://localhost:8080/engine-rest/deployment/create', formData, {
            headers: formData.getHeaders(),
        });        
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({error: error.message});
    };
});

module.exports = app;

app.listen(PORT, () => {
    console.log('Server is running on http://localhost:{PORT}');
});