const express = require('express');
const server = require('http').createServer();
const app = express();
const PORT = 3000;

app.get('/', function (req, res) {
  res.sendFile('index.html', { root: __dirname });
});

server.on('request', app);

server.listen(PORT, function () { console.log('Listening on ' + PORT); });

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');

  wss.clients.forEach(client => client.close());

  setTimeout(() => {
    shutdownDB();
  }, 500); // give pending inserts 500ms to complete
});

/** Websocket **/
const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({ server: server });

wss.on('connection', function connection(ws) {
  const numClients = wss.clients.size;

  console.log('clients connected: ', numClients);

  wss.broadcast(`Current visitors: ${numClients}`);

  if (ws.readyState === ws.OPEN) {
    ws.send('welcome to my server!');
  }

  db.run(`INSERT INTO visitors (count, time) VALUES (${numClients}, datetime('now'))`);

  // Fix 1: Use wss.clients.size at close-time, not connection-time
  ws.on('close', function close() {
    const numClients = wss.clients.size; // 👈 moved inside close handler
    wss.broadcast(`Current visitors: ${numClients}`);
    console.log('A client has disconnected');
  });

  ws.on('error', function error() {
    //
  });
});

/**
 * Broadcast data to all connected clients
 * @param  {Object} data
 * @void
 */
wss.broadcast = function broadcast(data) {
  console.log('Broadcasting: ', data);
  wss.clients.forEach(function each(client) {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
};
/** End Websocket **/
/* Begin Database */
const sqlite = require('sqlite3');
const db = new sqlite.Database(':memory:');

db.serialize(() => {
  db.run(`
      CREATE TABLE visitors (
        count INTEGER,
        time TEXT
      )
    `)
})

function getCounts(callback) {
  console.log('Getting visitor counts...');
  db.all('SELECT * FROM visitors', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
    } else {
      console.log('Visitors table (total rows:', rows.length + ')');
      if (rows.length === 0) {
        console.log('No visitor records');
      } else {
        rows.forEach(row => console.log(row));
      }
    }
    if (callback) callback();
  })
}

// Fix 2: Close DB only AFTER getCounts() finishes
function shutdownDB() {
  console.log('Shutting down db');
  db.each(
    "SELECT * FROM visitors",
    (err, row) => {
      if (err) console.error(err);
      else console.log(row);
    },
    () => {
      db.close();
      process.exit(0); // 👈 force clean exit after DB closes
    }
  );
}