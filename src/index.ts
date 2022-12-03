import Koa from 'koa';
import Router from '@koa/router';
import * as dotenv from 'dotenv';
import debug from 'debug';
import { useDb } from './lib/db';

dotenv.config();

const logger = debug('server');

const app = new Koa();
const router = new Router();

router.get('/counts', async ctx => {
  const pages = await ctx.db.getPagesCount();
  const links = await ctx.db.getLinksCount();
  const queue = await ctx.db.getQueueCount();
  const cooldown = await ctx.db.getCooldownCount();

  ctx.body = [{
    name: 'pages',
    value: pages
  }, {
    name: 'links',
    value: links
  }, {
    name: 'queue',
    value: queue
  }, {
    name: 'cooldown',
    value: cooldown
  }];
});

router.get('/counts/:host', async ctx => {
  const linkCounts = await ctx.db.getLinkCountsForHost(ctx.params.host);

  ctx.body = {
    counts: {
      links: linkCounts
    }
  };
});

router.get('/pages', async ctx => {
  ctx.body = await ctx.db.getPageListings();
});

router.get('/hosts', async ctx => {
  ctx.body = await ctx.db.getHosts();
});

router.get('/links/:host', async ctx  => {
  ctx.body = await ctx.db.getLinksForHost(ctx.params.host);
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
logger(`listening on ${process.env.LISTEN_PORT}`)