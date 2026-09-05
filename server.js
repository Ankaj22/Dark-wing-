const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const DB = path.join(DATA_DIR, 'movies.json');
if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 2 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'poster') {
      return cb(
        /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)
          ? null
          : new Error('Only image files allowed for poster'),
        /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)
      );
    }

    const allowedVideoExtensions = [
      '.mp4',
      '.mkv',
      '.avi',
      '.mov',
      '.webm',
      '.m4v',
      '.mpeg',
      '.mpg'
    ];

    const ext = path.extname(file.originalname).toLowerCase();
    const ok = allowedVideoExtensions.includes(ext);

    cb(ok ? null : new Error('Unsupported video format'), ok);
  }
});

function readMovies() { return JSON.parse(fs.readFileSync(DB, 'utf8')); }
function writeMovies(movies) { fs.writeFileSync(DB, JSON.stringify(movies, null, 2)); }
function auth(req, res, next) {
  if (req.headers.authorization === `Bearer ${ADMIN_PASSWORD}`) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.get('/api/movies', (_req, res) => res.json(readMovies()));
app.post('/api/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  res.json({ token: ADMIN_PASSWORD });
});

app.post('/api/movies', auth, upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'video', maxCount: 1 }]), (req, res) => {
  const poster = req.files?.poster?.[0];
  const video = req.files?.video?.[0];
  const movie = {
    id: crypto.randomUUID(),
    title: String(req.body.title || 'Untitled').slice(0, 200),
    year: String(req.body.year || '').slice(0, 10),
    genre: String(req.body.genre || '').slice(0, 80),
    poster: poster ? `/uploads/${poster.filename}` : '',
    video: video ? `/uploads/${video.filename}` : '',
    originalVideoName: video?.originalname || '',
    createdAt: new Date().toISOString()
  };
  const movies = readMovies(); movies.unshift(movie); writeMovies(movies);
  res.json(movie);
});

app.delete('/api/movies/:id', auth, (req, res) => {
  const movies = readMovies();
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ error: 'Not found' });
  for (const url of [movie.poster, movie.video]) {
    if (url?.startsWith('/uploads/')) fs.rmSync(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
  }
  writeMovies(movies.filter(m => m.id !== req.params.id));
  res.json({ ok: true });
});

app.get('/download/:id', (req, res) => {
  const movie = readMovies().find(m => m.id === req.params.id);
  if (!movie?.video) return res.status(404).send('Video not found');
  const file = path.join(UPLOAD_DIR, path.basename(movie.video));
  if (!fs.existsSync(file)) return res.status(404).send('Video not found');
  res.download(file, movie.originalVideoName || `${movie.title}.mp4`);
});
// USER ACCOUNTS
const USERS_FILE = path.join(__dirname, "users.json");

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8") || "[]");
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// CREATE NEW ACCOUNT
app.post("/api/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required"
    });
  }

  const users = readUsers();

  const exists = users.find(
    user => user.username.toLowerCase() === username.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({
      error: "Username already exists"
    });
  }

  users.push({
    id: crypto.randomUUID(),
    username: username.trim(),
    password: password
  });

  writeUsers(users);

  res.json({
    ok: true,
    message: "Account created successfully"
  });
});

// USER LOGIN
app.post("/api/user-login", (req, res) => {
  const { username, password } = req.body;

  const users = readUsers();

  const user = users.find(
    u =>
      u.username.toLowerCase() === String(username).toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Invalid username or password"
    });
  }

  res.json({
    ok: true,
    username: user.username
  });
});
app.get("/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});
app.get("/signup.html", (req, res) => {
  res.sendFile(path.join(__dirname, "signup.html"));
});
app.use('/uploads', express.static(UPLOAD_DIR));
app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || 'Upload failed' }));
app.listen(PORT, () => console.log(`DarkWing running on http://localhost:${PORT}`));
