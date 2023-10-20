import { v4 } from "uuid";
import { WebSocket } from "ws";

const env = process.env;

const SERVER = env.SERVER || "ws://localhost:3000/";
const LOG_MESSAGES = env.LOG_MESSAGES === "1";
const CLIENTS_TO_WAIT_FOR = parseInt(env.CLIENTS_COUNT || "", 10) || 32;
const DELAY = 512;
const MESSAGES_TO_SEND = [
  '{"op":"join_game","create":true,"playername":"kh"}',
  '{"op":"select_catagory","catagory":"writers"}',
  '{"op":"confirm_selections"}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":2}',
  '{"op":"next_question"}',
  '{"op":"vote","option":3}',
  '{"op":"next_question"}',
  '{"op":"vote","option":1}',
  '{"op":"next_question"}',
].flat();

const NAMES = Array.from({ length: 50 }, (a, i) => [
  "Alice" + i,
  "Bob" + i,
  "Charlie" + i,
  "David" + i,
  "Eve" + i,
  "Frank" + i,
  "Grace" + i,
  "Heidi" + i,
  "Ivan" + i,
  "Judy" + i,
  "Karl" + i,
  "Linda" + i,
  "Mike" + i,
  "Nancy" + i,
  "Oscar" + i,
  "Peggy" + i,
  "Quentin" + i,
  "Ruth" + i,
  "Steve" + i,
  "Trudy" + i,
  "Ursula" + i,
  "Victor" + i,
  "Wendy" + i,
  "Xavier" + i,
  "Yvonne" + i,
  "Zach" + i,
])
  .flat()
  .slice(0, CLIENTS_TO_WAIT_FOR);

console.log(`Connecting ${CLIENTS_TO_WAIT_FOR} WebSocket clients...`);
console.time(`All ${CLIENTS_TO_WAIT_FOR} clients connected`);

var remainingClients = CLIENTS_TO_WAIT_FOR;
var promises = [];

const clients = new Array(CLIENTS_TO_WAIT_FOR);
const gameID = v4()
console.log("GAMEID: ", gameID, `https://games.kieran.dev/play/${gameID}`);
for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
  clients[i] = new WebSocket(`${SERVER}?game=${gameID}&player=${NAMES[i]}`);
  promises.push(
    new Promise((resolve, reject) => {
      clients[i].onmessage = (event) => {
        resolve();
      };
    })
  );
}

await Promise.all(promises);
console.timeEnd(`All ${clients.length} clients connected`);

var received = 0;
var total = 0;
var more = false;
var remaining;

for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
  clients[i].onmessage = (event) => {
    if (LOG_MESSAGES) console.log(event.data);
    received++;
    remaining--;

    if (remaining === 0) {
      more = true;
      remaining = total;
    }
  };
}

// each message is supposed to be received
// by each client
// so its an extra loop
for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
  for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
    for (let k = 0; k < CLIENTS_TO_WAIT_FOR; k++) {
      total++;
    }
  }
}
remaining = total;

function restart() {
  for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
    for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
      clients[i].send(MESSAGES_TO_SEND[j]);
    }
  }
}

var runs = [];
setInterval(() => {
  const last = received;
  runs.push(last);
  received = 0;
  console.log(
    last,
    `messages per second (${CLIENTS_TO_WAIT_FOR} clients x ${MESSAGES_TO_SEND.length} msg, min delay: ${DELAY}ms)`
  );

  if (runs.length >= 5) {
    console.log("5 runs");
    console.log(JSON.stringify(runs, null, 2));
    if ("process" in globalThis) process.exit(0);
    runs.length = 0;
  }
}, 1000);
var isRestarting = false;
setInterval(() => {
  if (more && !isRestarting) {
    more = false;
    isRestarting = true;
    restart();
    isRestarting = false;
  }
}, DELAY);
restart();
