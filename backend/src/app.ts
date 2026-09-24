import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import authRoutes from './routes/auth.routes';
import kitRoutes from './routes/kit.routes';

export const app = express();


app.use(helmet());
const allowedOrigins = ['http://localhost:3000'];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(...process.env.FRONTEND_URL.split(','));
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Trust proxy is required if you are behind a reverse proxy (like Render)
// and want to serve secure cookies
app.set('trust proxy', 1);

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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
