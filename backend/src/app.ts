import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import authRoutes from './routes/auth.routes';
import kitRoutes from './routes/kit.routes';

export const app = express();


app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

const sessionStore = process.env.NODE_ENV === 'test' 
  ? new session.MemoryStore()
  : MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/ai-interview-prep'
    });

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
