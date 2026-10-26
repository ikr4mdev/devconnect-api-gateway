// websocket-client.cjs
const { io } = require('socket.io-client');

const URL = 'http://localhost:3000';
const FAILURE_TIMEOUT_MS = 10000;

let connectedClients = 0;

function onClientConnected() {
  connectedClients++;

  if (connectedClients === 2) {
    joiner.emit('join_demo_room', {}, (res) => {
      console.log('[joiner] joined:', res);
      joiner.emit('send_to_demo_room');
      console.log('[joiner] triggered send_to_demo_room');
    });
  }
}

function disconnectClients() {
  joiner.disconnect();
  observer.disconnect();
  console.log('both disconnected');
}

const failureTimeout = setTimeout(() => {
  console.error('Test failed: room message was not received in time.');
  disconnectClients();
  process.exitCode = 1;
}, FAILURE_TIMEOUT_MS);

// --- Client 1: joins the room, then triggers the broadcast ---
const joiner = io(URL, {
  auth: {
    token: process.env.ACCESS_TOKEN,
  },
});

joiner.on('connect', () => {
  console.log('[joiner] connected:', joiner.id);

  onClientConnected();
});

joiner.on('demo_room_message', (payload) => {
  console.log('[joiner] demo_room_message:', payload);
  clearTimeout(failureTimeout);

  disconnectClients();
});

joiner.on('connect_error', (error) => {
  console.log('[joiner] connection rejected:', error.message);
});

// --- Client 2: only listens, never joins, never emits ---
const observer = io(URL, {
  auth: {
    token: process.env.ACCESS_TOKEN,
  },
});

observer.on('connect', () => {
  console.log('[observer] connected:', observer.id);
  onClientConnected();
});

observer.on('demo_room_message', (payload) => {
  console.log('[observer] demo_room_message:', payload);
});

observer.on('connect_error', (error) => {
  console.log(`[observer] connection rejected:`, error.message);
});
