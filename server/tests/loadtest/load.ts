//@ts-check
/// <reference types="bun-types" />
import { v4 } from "uuid";
import { WebSocket } from "ws";

export function load_test() {
  return new Promise(async (resolve, reject) => {
    try {
      let runs = [];
      const start_interval = () => {
        setInterval(test_check, 1000);
      };

      function test_check() {
        const last = received;
        runs.push(last);
        received = 0;
        console.log(last, `rps [${CLIENTS_TO_WAIT_FOR} Clients]`);

        if (sent === toSend) {
          console.log("DONE");
          const average = runs.reduce((a, b) => a + b) / runs.length;
          console.log("avg:", `${average}/${total} messages per second`);
          resolve(average);
        }
      }

      const env = process.env;
      const SERVER = env.SERVER || "ws://localhost:3000/";
      const LOG_MESSAGES = env.LOG_MESSAGES === "1";
      const CLIENTS_TO_WAIT_FOR = parseInt(env.CLIENTS_COUNT || "", 10) || 8;

      const MESSAGES_TO_SEND = [
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":2}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":3}',
        '{"op":"vote","option":1}',
        '{"op":"vote","option":1}',
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

      let remainingClients = CLIENTS_TO_WAIT_FOR;
      let promises = [];

      const clients = new Array(CLIENTS_TO_WAIT_FOR);
      const gameID = v4();
      console.log(
        "GAMEID: ",
        gameID,
        `https://games.kieran.dev/play/${gameID}`
      );
      for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
        clients[i] = new WebSocket(
          `${SERVER}?game=${gameID}&player=${NAMES[i]}`
        );
        promises.push(
          new Promise((resolve, reject) => {
            clients[i].onmessage = (event) => {
              resolve(0);
            };
          })
        );
      }

      await Promise.all(promises);
      console.timeEnd(`All ${clients.length} clients connected`);

      let received = 0;
      let total = 0;
      let sent = 0;
      let toSend = 0;

      for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
        clients[i].onmessage = (event) => {
          if (LOG_MESSAGES) console.log(event.data);
          received++;
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

      total += (MESSAGES_TO_SEND.length - 3) * CLIENTS_TO_WAIT_FOR;

      for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
        for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
          toSend++;
        }
      }

      console.log(`Sending ${toSend} messages...`);
      console.time(`All ${toSend} messages sent`);
      // setup
      console.log("Setup");
      for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
        clients[i].send(
          `{ "op": "join_game", "create": true, "playername": "${NAMES[i]}"}`
        );
        await Bun.sleep(20);
        if (i === 0) {
          clients[i].send('{"op":"select_catagory","catagory":"writers"}');
          clients[i].send('{"op":"confirm_selections"}');
        }
      }

      start_interval();
      console.log("Sending messages");
      for (let j = 0; j < MESSAGES_TO_SEND.length; j++) {
        if (j > 2) {
          clients[0].send('{"op":"next_question"}');
          await Bun.sleep(10);
        }
        for (let i = 0; i < CLIENTS_TO_WAIT_FOR; i++) {
          sent++;
          clients[i].send(MESSAGES_TO_SEND[j]);
        }
        await Bun.sleep(10);
      }
      console.timeEnd(`All ${toSend} messages sent`);
    } catch (e) {
      console.error(e);
      reject(e);
    }
  });
}
