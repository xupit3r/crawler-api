import Koa from 'koa';
import Router from '@koa/router';
import * as dotenv from 'dotenv';
import debug from 'debug';
import { useDb } from './lib/db';
import { setupSockets } from './lib/socket';

dotenv.config();

const logger = debug('server');

const app = new Koa();
const router = new Router();

// sets up the web sockets
setupSockets();

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
  ctx.body = await ctx.db.getPageListings(ctx.query.limit);
});

router.get('/search/pages', async ctx => {
  try {
    if (typeof ctx.query.ids === 'string') {
      const ids = JSON.parse(ctx.query.ids);
      ctx.body = await ctx.db.getPagesByIds(ids);
    } else {
      ctx.status = 400;
      ctx.body = {
        err: true,
        message: 'bad request'
      }
    }
  } catch (err) {
    logger(err);
    ctx.status = 400;
    ctx.body = {
      err: true,
      message: 'bad request'
    }
  }
})

router.get('/pages/byid/:pageId', async ctx => {
  ctx.body = await ctx.db.getPage(ctx.params.pageId);
});

router.get('/pages/texts', async ctx => {
  ctx.body = await ctx.db.getPageTexts();
});

router.get('/pages/text/:pageId', async ctx => {
  ctx.body = await ctx.db.getPageText(ctx.params.pageId);
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