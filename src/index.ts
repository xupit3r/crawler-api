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

  ctx.body = {
    pages,
    links,
    queue,
    cooldown
  };
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