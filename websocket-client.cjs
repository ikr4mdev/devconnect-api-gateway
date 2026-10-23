// websocket-client.cjs
const { io } = require('socket.io-client');

const URL = 'http://localhost:3000';
const STAY_MS = 2000;

// --- Client 1: joins the room, then triggers the broadcast ---
const joiner = io(URL, {
  auth: {
    token: 'valid-token',
  },
});

joiner.on('connect', () => {
  console.log('[joiner] connected:', joiner.id);

  joiner.emit('join_demo_room', {}, (res) => {
    console.log('[joiner] joined:', res);
    joiner.emit('send_to_demo_room');
    console.log('[joiner] triggered send_to_demo_room');
  });
});

joiner.on('demo_room_message', (payload) => {
  console.log('[joiner] demo_room_message:', payload);
});

joiner.on('connect_error', (error) => {
  console.log('[joiner] connection rejected:', error.message);
});

// --- Client 2: only listens, never joins, never emits ---
const observer = io(URL, {
  auth: {
    token: 'not-a-valid-jwt',
  },
});

observer.on('connect', () => {
  console.log('[observer] connected:', observer.id);
});

observer.on('demo_room_message', (payload) => {
  console.log('[observer] demo_room_message:', payload);
});

observer.on('connect_error', (error) => {
  console.log(`[observer] connection rejected:`, error.message);
});

// --- Keep both alive ---
setTimeout(() => {
  joiner.disconnect();
  observer.disconnect();
  console.log('both disconnected');
}, STAY_MS);
