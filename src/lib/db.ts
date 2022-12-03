import * as dotenv from 'dotenv';
import { MongoClient } from "mongodb";
import debug from 'debug';
import { exit } from 'process';
import { Link, LinkLookup, Unqiues } from './types';

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

  const getPageListings = async () => {
    const pageDocs = await pages.find().project({
      url: 1,
      host: 1,
      status: 1
    }).toArray();

    const linkDocs = await links.find().project({
      source: 1,
      sourceHost: 1
    }).toArray();

    const lookup: LinkLookup = linkDocs.reduce((lk: LinkLookup, doc) => {
      if (!lk[doc.source]) {
        lk[doc.source] = [];
      }

      lk[doc.source].push({
        url: doc.url,
        host: doc.host,
        source: doc.source,
        sourceHost: doc.soureHost
      });

      return lk;
    }, {});

    return pageDocs.map(page => {
      const pageLinks = (typeof lookup[page.url] !== 'undefined'
        ? lookup[page.url]
        : []
      );

      const uniqueHosts = Object.keys(pageLinks.reduce((h: Unqiues, link: Link) => {
        h[link.host] = true;
        return h;
      }, {}));

      return {
        ...page,
        ...{
          counts: {
            links: pageLinks.length,
            uniqueHosts: uniqueHosts.length
          }
        }
      };
    });
  }

  const getHosts = async () => {
    return await pages.distinct('host');
  }

  const getLinkCountsForHost = async (host: string) => {
    return await links.countDocuments({
      host: host
    });
  }

  const getLinksForHost = async (host: string) => {
    return await links.find({
      host: host
    }).project({
      url: 1,
      source: 1
    }).toArray();
  }
  
  return {
    getPagesCount,
    getLinksCount,
    getQueueCount,
    getCooldownCount,
    getPageListings,
    getHosts,
    getLinkCountsForHost,
    getLinksForHost
  }
}