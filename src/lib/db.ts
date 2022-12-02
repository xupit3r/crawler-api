import * as dotenv from 'dotenv';
import { MongoClient } from "mongodb";
import debug from 'debug';
import { exit } from 'process';
import { CooldownHost, Link, Page, ToBeVisited } from './types';

const logger = debug('db');

dotenv.config();

if (typeof process.env.MONGO_CONNECT_STRING === 'undefined') {
  logger('MONGO_CONNECT_STRING must be defined in .env');
  exit(-1);
}

const storage = new MongoClient(process.env.MONGO_CONNECT_STRING);


export const useDb = async () => {
  // add the page to storage for safe keeping
  await storage.connect();

  // grab the collections
  const db = storage.db('crawler');

  // collections that may be used
  const pages = db.collection('pages');
  const links = db.collection('links');
  const queue = db.collection('queue');
  const cooldown = db.collection('cooldown');

  const getPagesCount = async () => {
    return await pages.countDocuments();
  }

  const getLinksCount = async () => {
    return await links.countDocuments();
  }

  const getQueueCount = async () => {
    return await queue.countDocuments();
  }

  const getCooldownCount = async () => {
    return await cooldown.countDocuments();
  }
  
  return {
    getPagesCount,
    getLinksCount,
    getQueueCount,
    getCooldownCount
  }
}