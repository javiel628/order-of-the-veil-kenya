const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'order_of_the_veil.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'admin').trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeThisPasswordToSomethingStrong123!';

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log(`Database ready: ${DB_PATH}`);
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) {
      reject(err);
      return;
    }
    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(row);
  });
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rows);
  });
});

const sanitizeText = (value, defaultValue = '') => {
  if (typeof value !== 'string') return defaultValue;
  return value.trim().replace(/\s+/g, ' ');
};

const csrfProtection = csrf({ cookie: true });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: false,
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'order-of-the-veil-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8,
  },
}));

const adminRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please wait a few minutes.' },
});

const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions from this IP. Please try again in a few minutes.' },
});

const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ authenticated: false, error: 'Unauthorized. Please sign in.' });
};

const initializeDatabase = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      county TEXT NOT NULL,
      message TEXT NOT NULL,
      consent INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'new',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      admin_note TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const existingAdmin = await get('SELECT id FROM admin_users WHERE username = ?', [ADMIN_USERNAME]);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  if (!existingAdmin) {
    await run('INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [ADMIN_USERNAME, passwordHash]);
  } else {
    await run('UPDATE admin_users SET password_hash = ? WHERE username = ?', [passwordHash, ADMIN_USERNAME]);
  }
};

const publicSubmissionRules = [
  body('full_name').trim().isLength({ min: 2, max: 120 }).withMessage('Full name is required.'),
  body('email').trim().isEmail().withMessage('Please enter a valid email address.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ min: 7, max: 30 }).withMessage('Phone number must be 7 to 30 characters long if provided.'),
  body('county').trim().isLength({ min: 2, max: 80 }).withMessage('County is required.'),
  body('message').trim().isLength({ min: 20, max: 2000 }).withMessage('Your message must be at least 20 characters long.'),
  body('consent').custom((value) => value === true || value === 'true' || value === 'on' || value === '1').withMessage('You must agree to the privacy notice before submitting.'),
];

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.post('/api/submit', publicSubmitLimiter, publicSubmissionRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed.', details: errors.array().map((item) => item.msg) });
  }

  const fullName = sanitizeText(req.body.full_name, '');
  const email = sanitizeText(req.body.email, '').toLowerCase();
  const phone = sanitizeText(req.body.phone || '', '');
  const county = sanitizeText(req.body.county, '');
  const message = sanitizeText(req.body.message, '');
  const consent = req.body.consent === true || req.body.consent === 'true' || req.body.consent === 'on' || req.body.consent === '1';

  if (!consent) {
    return res.status(400).json({ error: 'Consent is required.' });
  }

  try {
    const result = await run(
      'INSERT INTO submissions (full_name, email, phone, county, message, consent, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [fullName, email, phone, county, message, 1, 'new']
    );

    return res.status(201).json({
      success: true,
      message: 'Your interest has been submitted successfully. We will review it soon.',
      submissionId: result.lastID,
    });
  } catch (error) {
    console.error('Submission save failed:', error);
    return res.status(500).json({ error: 'Unable to submit your interest. Please try again later.' });
  }
});

app.post('/api/login', adminRateLimiter, csrfProtection, async (req, res) => {
  const username = sanitizeText(req.body.username || '', '').toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await get('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const passwordOK = await bcrypt.compare(password, user.password_hash);
    if (!passwordOK) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    req.session.isAdmin = true;
    req.session.username = username;
    return res.json({ success: true, message: 'Login successful.' });
  } catch (error) {
    console.error('Admin login failed:', error);
    return res.status(500).json({ error: 'Unable to log in at this time.' });
  }
});

app.post('/api/logout', csrfProtection, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

app.get('/api/dashboard', requireAdmin, async (req, res) => {
  try {
    const total = await get('SELECT COUNT(*) AS total FROM submissions');
    const newCount = await get("SELECT COUNT(*) AS total FROM submissions WHERE status = 'new'");
    const reviewed = await get("SELECT COUNT(*) AS total FROM submissions WHERE status IN ('under_review', 'accepted', 'rejected')");

    return res.json({
      authenticated: true,
      username: req.session.username,
      stats: {
        total: Number(total.total || 0),
        new: Number(newCount.total || 0),
        reviewed: Number(reviewed.total || 0),
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ error: 'Unable to load dashboard data.' });
  }
});

app.get('/api/submissions', requireAdmin, async (req, res) => {
  try {
    const status = sanitizeText(req.query.status || '', 'all');
    const search = sanitizeText(req.query.search || '', '');
    let sql = 'SELECT * FROM submissions';
    const params = [];
    const conditions = [];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR county LIKE ? OR message LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await all(sql, params);
    return res.json(rows);
  } catch (error) {
    console.error('Submission fetch error:', error);
    return res.status(500).json({ error: 'Unable to retrieve submissions.' });
  }
});

app.get('/api/submission/:id', requireAdmin, async (req, res) => {
  try {
    const row = await get('SELECT * FROM submissions WHERE id = ?', [req.params.id]);
    if (!row) {
      return res.status(404).json({ error: 'Submission not found.' });
    }
    return res.json(row);
  } catch (error) {
    console.error('Submission detail fetch error:', error);
    return res.status(500).json({ error: 'Unable to retrieve submission.' });
  }
});

app.patch('/api/submission/:id/status', requireAdmin, csrfProtection, async (req, res) => {
  try {
    const status = sanitizeText(req.body.status || 'new', 'new');
    const adminNote = sanitizeText(req.body.admin_note || '', '');
    const validStatuses = ['new', 'under_review', 'accepted', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status selected.' });
    }

    const existing = await get('SELECT id FROM submissions WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    await run(
      'UPDATE submissions SET status = ?, admin_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, adminNote, req.params.id]
    );

    return res.json({ success: true, message: 'Submission updated successfully.' });
  } catch (error) {
    console.error('Status update failed:', error);
    return res.status(500).json({ error: 'Unable to update submission status.' });
  }
});

app.delete('/api/submission/:id', requireAdmin, csrfProtection, async (req, res) => {
  try {
    const existing = await get('SELECT id FROM submissions WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    await run('DELETE FROM submissions WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Submission deleted.' });
  } catch (error) {
    console.error('Submission delete failed:', error);
    return res.status(500).json({ error: 'Unable to delete submission.' });
  }
});

app.get('/api/submissions/export.csv', requireAdmin, async (req, res) => {
  try {
    const rows = await all('SELECT * FROM submissions ORDER BY created_at DESC');
    const header = ['id', 'full_name', 'email', 'phone', 'county', 'message', 'consent', 'status', 'created_at', 'updated_at', 'reviewed_at', 'admin_note'];

    const escapeCSV = (value) => {
      const text = String(value ?? '');
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      header.join(','),
      ...rows.map((row) => [row.id, row.full_name, row.email, row.phone, row.county, row.message, row.consent, row.status, row.created_at, row.updated_at, row.reviewed_at, row.admin_note].map(escapeCSV).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('CSV export failed:', error);
    return res.status(500).json({ error: 'Unable to export submissions.' });
  }
});

app.use(express.static(PUBLIC_DIR));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

const startServer = async () => {
  await initializeDatabase();

  if (!process.env.ADMIN_PASSWORD) {
    console.warn('Warning: ADMIN_PASSWORD was not set. The default example password is active. Update .env immediately.');
  }

  app.listen(PORT, () => {
    console.log(`Order of the Veil Kenya server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  db.close(() => {
    console.log('SQLite connection closed.');
    process.exit(0);
  });
});
