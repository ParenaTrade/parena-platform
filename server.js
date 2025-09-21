import 'dotenv/config';
import express from 'express';
import generateCode from './backend/generateCode.js';

const app = express();
app.use(express.json());

app.post('/api/generate-code', generateCode);

app.listen(3000, () => console.log('✅ Backend 3000 portunda çalışıyor'));
