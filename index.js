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
    res.render('admin', { tables: tables.rows, notes: notes.rows });
  } catch (err) {
    console.error(err);
    res.render('admin', { tables: [], notes: [] });
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
    console.log('Database initialized');
  } catch (err) {
    console.error('Database init error:', err);
  }
};

app.listen(PORT, async () => {
  await initDb();
  console.log(`Server running on port ${PORT}`);
});
