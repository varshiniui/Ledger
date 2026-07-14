import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import expenseRoutes from './routes/expenses.js';
import parseRoutes from './routes/parse.js';
dotenv.config();
import adminRoutes from './routes/admin.js';

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ledger-zeta-gules.vercel.app',
  ],
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/expenses', parseRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});