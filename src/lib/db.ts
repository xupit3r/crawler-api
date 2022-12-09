import * as dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb";
import debug from 'debug';
import { exit } from 'process';
import { Site } from './types';

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
  const queue = db.collection('queue');
  const cooldown = db.collection('cooldown');

  const getPagesCount = async () => {
    return await pages.estimatedDocumentCount();
  }

  const getQueueCount = async () => {
    return await queue.estimatedDocumentCount();
  }

  const getCooldownCount = async () => {
    return await cooldown.estimatedDocumentCount();
  }

  const getSiteCounts = async () => {
    const hosts = await pages.distinct('host');
    return hosts.length;
  }

  const getPageListings = async () => {
    return await pages.find().project({
      _id: 1,
      url: 1,
      host: 1
    }).toArray();
  }

  const searchPages = async (search: string) => {
    return await pages.find({ 
      $text: { $search: search } 
    }).sort({ 
      score: { $meta: "textScore" } 
    }).limit(50).project({
      _id: 1,
      url: 1,
      score: { $meta: "textScore" }
    }).toArray();
  }

  const getPage = async (pageId: string) => {
    return await pages.findOne({
      _id: new ObjectId(pageId)
    });
  };

  const getSiteListings = async () => {
    const hostDocs = await pages.distinct('host');
    const sites: Array<Site> = hostDocs.filter(host => host.length).map(host => ({
      name: host
    }));

    return sites.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      } else if (a.name > b.name) {
        return 1;
      }

      return 0
    });
  }

  const getUpNext = async (num: number = 50) => {
    const cooldownHosts = await cooldown.distinct('hostname');

    let query = {};
    if (cooldownHosts.length > 0) {
      query = {
        host: { $nin: cooldownHosts }
      };
    } else {
      query = {};
    }

    const docs = await queue.find(query, { sort: { _id: 1 }}).project({
      _id: 1,
      url: 1,
      date: 1,
      processing: 1
    }).limit(num).toArray();

    return docs.map(doc => ({
      _id: doc._id,
      url: doc.url,
      date: doc.date,
      processing: doc.processing ? true : false
    }));
  }

  const getCooldown = async () => {
    return await cooldown.find({}).toArray();
  }
  
  
  return {
    getPagesCount,
    getSiteCounts,
    getQueueCount,
    getCooldownCount,
    getPageListings,
    searchPages,
    getPage,
    getSiteListings,
    getUpNext,
    getCooldown
  }
}