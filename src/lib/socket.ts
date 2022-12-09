import { WebSocketServer } from 'ws';
import debug from 'debug';
import { useDb } from './db'

const logger = debug('wss');

let WSS_PORT: number = 4000;
if (typeof process.env.WSS_PORT !== 'undefined') {
  WSS_PORT = Number.parseInt(process.env.WSS_PORT);
} else {
  logger(`.env does not contain a WSS_PORT entry, defaulting to ${WSS_PORT}`)
}

const wss = new WebSocketServer({
  port: WSS_PORT
}, () => logger(`wss listening on port ${WSS_PORT}`));

wss.on('connection', (ws) => {
  ws.on('message', (data, isBinary) => {
    if (!isBinary) {
      logger(`received message ${data}`);
    } else {
      logger(`received a binary message`);
    }
  });

  logger(`client connected`);
});

export const setupSockets = () => {
  setInterval(async () => {
    const db = await useDb();

    const [
      pages,
      queue, 
      cooldown, 
      sites,
      upNext,
      cooldownHosts
    ] = await Promise.all([
      db.getPagesCount(),
      db.getQueueCount(),
      db.getCooldownCount(),
      db.getSiteCounts(),
      db.getUpNext(10),
      db.getCooldown()
    ]);
  
    const counts = [{
      name: 'sites',
      value: sites
    }, {
      name: 'pages',
      value: pages
    }, {
      name: 'queue',
      value: queue
    }, {
      name: 'cooldown',
      value: cooldown
    }];



    wss.clients.forEach(client => {
      client.send(JSON.stringify({
        type: 'dashboard',
        counts: counts,
        upNext: upNext,
        cooldown: cooldownHosts
      }));
    })
  }, 500);
}