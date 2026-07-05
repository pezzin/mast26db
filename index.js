require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  if (req.path.startsWith('/admin') || req.path.match(/\.(css|js|ico|png|jpg)$/i)) {
    return next();
  }
  
  try {
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();
    const ipHash = ip ? ip.substring(0, Math.min(ip.length, 15)) + '***' : 'unknown';
    
    await pool.query(`
      INSERT INTO page_views (path, ip_hash, user_agent, referrer)
      VALUES ($1, $2, $3, $4)
    `, [
      req.path || '/',
      ipHash,
      req.headers['user-agent']?.substring(0, 255) || null,
      req.headers['referer']?.substring(0, 255) || null
    ]);
  } catch (err) {
    console.error('Tracking error:', err);
  }
  next();
});

const brawlers = [
  'Shelly', 'Colt', 'Bull', 'Jessie', 'Nita', 'Dynamike', 'El Primo', 'Barley', 'Brock',
  'Rico', 'Spike', 'Mortis', 'Crow', 'Leon', 'Sandy', 'Amber', 'Gale', 'Surge', 'Colette',
  'Belle', 'Squeak', 'Grom', 'Buzz', 'Fang', 'Eve', 'Janet', 'Bonnie', 'Otis', 'Ash',
  'Lola', 'Fangs', 'Guff', 'Ruffs', 'Lou', 'Tick', '8-Bit', 'Pam', 'Bibi', 'Penny',
  'Gene', 'Tara', 'Max', 'Mr. P', 'Sprout', 'Byron', 'Piper', 'Bea', 'Nani', 'Bo',
  'Emz', 'Frank', 'Poco', 'Rosa', 'Edgar', 'Stu', 'Chester', 'Charlie', 'Pearl', 'Maisie',
  'Hank', 'R-T', 'Willow', 'Doug', 'Chuck', 'Pearl', 'Draco', 'Lily', 'Mico', 'Melodie',
  'Draco', 'Lily', 'Mico', 'Melodie', 'Clancy', 'Berry', 'Buster', 'Gray', 'Rosa'
];

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
    res.render('index', { notes: result.rows, brawlers });
  } catch (err) {
    console.error(err);
    res.render('index', { notes: [], brawlers });
  }
});

app.post('/flip', (req, res) => {
  const result = Math.random() < 0.5 ? 'Testa' : 'Croce';
  res.json({ result });
});

app.post('/random', (req, res) => {
  const max = parseInt(req.body.max) || 67;
  const result = Math.floor(Math.random() * max) + 1;
  res.json({ result });
});

app.post('/brawler', (req, res) => {
  const brawler = brawlers[Math.floor(Math.random() * brawlers.length)];
  res.json({ brawler });
});

app.post('/notes', async (req, res) => {
  const { content } = req.body;
  if (content && content.trim()) {
    try {
      await pool.query('INSERT INTO notes (content) VALUES ($1)', [content.trim()]);
    } catch (err) {
      console.error(err);
    }
  }
  res.redirect('/');
});

app.post('/notes/:id/delete', async (req, res) => {
  try {
    await pool.query('DELETE FROM notes WHERE id = $1', [req.params.id]);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/');
});

app.get('/admin', async (req, res) => {
  try {
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    const notes = await pool.query('SELECT * FROM notes ORDER BY created_at DESC');
    
    const stats = {};
    stats.total = (await pool.query('SELECT COUNT(*) as count FROM page_views')).rows[0].count;
    stats.today = (await pool.query("SELECT COUNT(*) as count FROM page_views WHERE created_at::date = CURRENT_DATE")).rows[0].count;
    stats.week = (await pool.query("SELECT COUNT(*) as count FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days'")).rows[0].count;
    
    stats.byPath = (await pool.query(`
      SELECT path, COUNT(*) as visits 
      FROM page_views 
      GROUP BY path 
      ORDER BY visits DESC 
      LIMIT 10
    `)).rows;
    
    stats.byDay = (await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as visits
      FROM page_views
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)).rows;
    
    stats.recent = (await pool.query(`
      SELECT * FROM page_views ORDER BY created_at DESC LIMIT 50
    `)).rows;

    res.render('admin', { tables: tables.rows, notes: notes.rows, stats });
  } catch (err) {
    console.error(err);
    res.render('admin', { tables: [], notes: [], stats: null });
  }
});

app.post('/admin/query', async (req, res) => {
  const { query } = req.body;
  try {
    const result = await pool.query(query);
    res.render('admin', { 
      tables: (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows,
      notes: (await pool.query('SELECT * FROM notes ORDER BY created_at DESC')).rows,
      queryResult: result.rows,
      queryError: null
    });
  } catch (err) {
    res.render('admin', { 
      tables: (await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows,
      notes: (await pool.query('SELECT * FROM notes ORDER BY created_at DESC')).rows,
      queryResult: null,
      queryError: err.message
    });
  }
});

app.get('/canoa-polo', (req, res) => {
  res.render('canoa-polo');
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        ip_hash VARCHAR(50),
        user_agent VARCHAR(255),
        referrer VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
};

app.listen(PORT, async () => {
  await initDb();
  console.log(`Server running on port ${PORT}`);
});
