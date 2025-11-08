import express from 'express';
import dotenv from 'dotenv';
import db from './db/knex';
import authRouter from './api/auth';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// API Routers
app.use('/api/auth', authRouter);


// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    res.status(200).send({ status: 'ok', db: 'connected' });
  } catch (e) {
    const error = e as Error;
    console.error('Health check failed:', error.message);
    res.status(500).send({ status: 'error', db: 'disconnected', error: error.message });
  }
});

// A simple root endpoint
app.get('/', (req, res) => {
  res.send('GCal Chara Notifier Backend is running!');
});


app.listen(port, () => {
  console.log(`Backend server is running at http://localhost:${port}`);
});
