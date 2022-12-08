import Koa from 'koa';
import Router from '@koa/router';
import { WebSocketServer } from 'ws';
import * as dotenv from 'dotenv';
import debug from 'debug';
import { useDb } from './lib/db';

dotenv.config();

const logger = debug('server');

const app = new Koa();
const router = new Router();

let WSS_PORT = 4000;
if (typeof process.env.WSS_PORT === 'number') {
  WSS_PORT = process.env.WSS_PORT;
} else {
  logger(`.env does not contain a WSS_PORT entry, defaulting to ${WSS_PORT}`)
}

const wss = new WebSocketServer({
  port: WSS_PORT
}, () => logger(`wss listening on port ${WSS_PORT}`));

wss.on('connection', (ws) => {
  ws.on('message', (data, isBinary) => {
    if (!isBinary) {
      logger(`wss received message ${data}`);
    } else {
      logger(`wss received a binary message`);
    }
  });

  logger(`ws client connected`);
});

const socketDumps = async () => {
  const db = await useDb();

  setInterval(async () => {
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


router.get('/counts', async ctx => {
  const [
    pages,
    queue, 
    cooldown, 
    sites
  ] = await Promise.all([
    ctx.db.getPagesCount(),
    ctx.db.getQueueCount(),
    ctx.db.getCooldownCount(),
    ctx.db.getSiteCounts()
  ]);

  ctx.body = [{
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
});

router.get('/next/:number', async ctx => {
  ctx.body = await ctx.db.getUpNext(+ctx.params.number);
});

router.get('/pages', async ctx => {
  ctx.body = await ctx.db.getPageListings();
});

router.get('/pages/search', async ctx => {
  ctx.body = await ctx.db.searchPages(ctx.query.search);
})

router.get('/pages/byid/:pageId', async ctx => {
  ctx.body = await ctx.db.getPage(ctx.params.pageId);
});

router.get('/sites', async ctx => {
  ctx.body = await ctx.db.getSiteListings();
});

router.get('/cooldown', async ctx => {
  ctx.body = await ctx.db.getCooldown();
});

// our entry point
app.use(async (ctx, next) => {
  ctx.db = await useDb();
  
  const start = Date.now();
  await next();
  const total = Date.now() - start;

  logger(`${ctx.request.method} request to ${ctx._matchedRoute} took ${total}ms`);
});

app.use(router.routes());

app.listen(process.env.LISTEN_PORT);
logger(`listening on ${process.env.LISTEN_PORT}`);

socketDumps();