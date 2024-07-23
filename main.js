const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3300;

// Open the SQLite databases
const pbpDb = new sqlite3.Database('play_by_play_2024.db', (err) => {
  if (err) {
    console.error('Error opening play_by_play_2024.db database ' + err.message);
  } else {
    console.log('Connected to the play_by_play_2024.db database.');
  }
});

const scheduleDb = new sqlite3.Database('wnba_schedule_2024.db', (err) => {
  if (err) {
    console.error('Error opening wnba_schedule_2024.db database ' + err.message);
  } else {
    console.log('Connected to the wnba_schedule_2024.db database.');
  }
});

// Function to query the database
const queryDatabase = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Middleware to handle JSON requests
app.use(express.json());

// Define API routes for play-by-play data
app.get('/plays', async (req, res) => {
  try {
    const rows = await queryDatabase(pbpDb, 'SELECT * FROM wnba_pbp');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching all plays:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.get('/plays/:game_id', async (req, res) => {
  const { game_id } = req.params;
  if (!game_id) {
    return res.status(400).json({ error: 'Game ID is required' });
  }
  try {
    const rows = await queryDatabase(pbpDb, 'SELECT * FROM wnba_pbp WHERE game_id = ?', [game_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No records found for the specified game ID' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching plays by game ID:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.get('/plays/date/:game_date', async (req, res) => {
  const { game_date } = req.params;
  if (!game_date) {
    return res.status(400).json({ error: 'Game date is required' });
  }
  try {
    const rows = await queryDatabase(pbpDb, 'SELECT * FROM wnba_pbp WHERE game_date = ?', [game_date]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No records found for the specified game date' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching plays by game date:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.get('/plays/date/:game_date/game/:game_id', async (req, res) => {
  const { game_date, game_id } = req.params;
  if (!game_date || !game_id) {
    return res.status(400).json({ error: 'Both game date and game ID are required' });
  }
  try {
    const rows = await queryDatabase(pbpDb, 'SELECT * FROM wnba_pbp WHERE game_date = ? AND game_id = ?', [game_date, game_id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No records found for the specified game date and game ID' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching plays by game date and game ID:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// Define API routes for game schedule data
app.get('/games', (req, res) => {
  let sql = `SELECT * FROM wnba_schedule`;
  queryDatabase(scheduleDb, sql)
    .then(rows => res.json({ message: "success", data: rows }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

app.get('/games/:id', (req, res) => {
  let sql = `SELECT * FROM wnba_schedule WHERE id = ?`;
  let params = [req.params.id];
  queryDatabase(scheduleDb, sql, params)
    .then(row => res.json({ message: "success", data: row }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

app.get('/games/home/:name', (req, res) => {
  let sql = `SELECT * FROM wnba_schedule WHERE home_short_display_name = ?`;
  let params = [req.params.name];
  queryDatabase(scheduleDb, sql, params)
    .then(rows => res.json({ message: "success", data: rows }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

app.get('/games/away/:name', (req, res) => {
  let sql = `SELECT * FROM wnba_schedule WHERE away_short_display_name = ?`;
  let params = [req.params.name];
  queryDatabase(scheduleDb, sql, params)
    .then(rows => res.json({ message: "success", data: rows }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

app.get('/games/status/:status', (req, res) => {
  const validStatuses = ['STATUS_FINAL', 'STATUS_SCHEDULED'];
  const status = req.params.status;
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ "error": "Invalid status type" });
  }
  let sql = `SELECT * FROM wnba_schedule WHERE status_type_name = ?`;
  let params = [status];
  queryDatabase(scheduleDb, sql, params)
    .then(rows => res.json({ message: "success", data: rows }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

app.get('/games/date/:date', (req, res) => {
  let date = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ "error": "Invalid date format. Use YYYY-MM-DD" });
  }
  let sql = `SELECT * FROM wnba_schedule WHERE strftime('%Y-%m-%d', date) = ?`;
  let params = [date];
  queryDatabase(scheduleDb, sql, params)
    .then(rows => res.json({ message: "success", data: rows }))
    .catch(err => res.status(400).json({ "error": err.message }));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Close the database connections when the process ends
process.on('SIGINT', () => {
  pbpDb.close((err) => {
    if (err) {
      console.error('Error closing play_by_play_2024.db database ' + err.message);
    } else {
      console.log('Closed play_by_play_2024.db database.');
    }
  });
  scheduleDb.close((err) => {
    if (err) {
      console.error('Error closing wnba_schedule_2024.db database ' + err.message);
    } else {
      console.log('Closed wnba_schedule_2024.db database.');
    }
    process.exit(0);
  });
});
