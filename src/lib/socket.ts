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
  ws.on('message', async (data, isBinary) => {
    if (isBinary) {
      logger(`NOT_SUPPORTED: received binary message`);
      return;
    }

    try {
      const req = JSON.parse(data.toString());
      const db = await useDb();

      if (req.type === 'pages') {
        logger('PAGE -- sending pages...');
        db.getPagesStream().on('data', (doc) => {
          ws.send(JSON.stringify({
            type: 'page',
            page: doc
          }));
        }).on('end', () => logger('PAGE -- done sending page data.'));;
      } else if (req.type === 'tf') {
        logger('TF -- sending tf info...');
        db.getPageTFStream().on('data', (doc) => {
          ws.send(JSON.stringify({
            type: 'tf',
            tf: doc
          }));
        }).on('end', () => logger('TF -- done sending TF data.'));
      } else {
        logger(`didn't recognize request type ${req.type}`);
      }
    } catch (err) {
      logger('did not receive JSON data.')
    }
  });

  logger(`client connected`);
});

export const setupSockets = () => {
  // setInterval(async () => {
  //   const db = await useDb();

  //   const [
  //     pages,
  //     queue, 
  //     cooldown, 
  //     sites,
  //     upNext,
  //     cooldownHosts
  //   ] = await Promise.all([
  //     db.getPagesCount(),
  //     db.getQueueCount(),
  //     db.getCooldownCount(),
  //     db.getSiteCounts(),
  //     db.getUpNext(10),
  //     db.getCooldown()
  //   ]);
  
  //   const counts = [{
  //     name: 'sites',
  //     value: sites
  //   }, {
  //     name: 'pages',
  //     value: pages
  //   }, {
  //     name: 'queue',
  //     value: queue
  //   }, {
  //     name: 'cooldown',
  //     value: cooldown
  //   }];



  //   wss.clients.forEach(client => {
  //     client.send(JSON.stringify({
  //       type: 'dashboard',
  //       counts: counts,
  //       upNext: upNext,
  //       cooldown: cooldownHosts
  //     }));
  //   })
  // }, 500);
}