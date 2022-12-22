import * as dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb";
import debug from 'debug';
import { exit } from 'process';
import { Lookup, ObjectLookup, Site } from './types';
import { prepareTerm, scoreMatches } from './search';

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
  const text = db.collection('text');
  const terms = db.collection('terms');
  const tokens = db.collection('tokens');

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

  const getPageListings = async (limit: number = -1) => {
    const cursor = await pages.find().project({
      _id: 1,
      url: 1,
      summarized: 1,
      sentiment: 1
    });

    if (limit !== -1) {
      return cursor.limit(+limit).toArray();
    }

    return cursor.toArray();
  }

  const getPagesByIds = async (ids: Array<string> | Array<ObjectId>) => {
    const results = await pages.find({
      _id: {
        $in: ids.map(id => new ObjectId(id))
      }
    }).project({
      _id: 1,
      url: 1,
      summarized: 1,
      sentiment: 1,
      summary: 1,
      tags: 1
    }).toArray();

    const lookup = results.reduce((l: ObjectLookup, pageDoc) => {
      l[pageDoc._id] = pageDoc;
      return l;
    }, {});

    return ids.map(id => {
      return lookup[id.toString()];
    }).filter(doc => !!doc);
  }

  const getPagesStream = () => {
    return pages.find().project({
      _id: 1,
      url: 1,
      summary: 1,
      summarized: 1,
      sentiment: 1
    }).stream();
  }

  const getPage = async (pageId: string) => {
    return await pages.findOne({
      _id: new ObjectId(pageId)
    });
  };

  const getPageTexts = async () => {
    return await text.find().project({
      page: 1,
      text: 1
    }).toArray();
  }

  const getPageTFStream = () => {
    return terms.find().stream();
  }

  const getMatchedPages = async (term: string) => {
    const terms = prepareTerm(term);

    // pull the matches from the token collection
    const matches = await tokens.find({
      term: {
        $in: terms
      }
    }).sort({
      score: -1
    }).toArray();

    // get the total number of pages
    const total = await pages.estimatedDocumentCount();

    // find the pages (ids) that best match 
    // the search term
    const matchedPages = scoreMatches(
      terms,
      matches.map(match => ({
        page: match.page,
        term: match.term,
        score: match.score
      })),
      total
    );

    return await getPagesByIds(matchedPages);
  }

  const getSuggestions = async (term: string) => {
    const suggestions = await tokens.find({
      $text: { $search: term }
    }).project({
      score: { score: { $meta: 'textScore' } }
    }).sort({ score: { $meta: 'textScore' } }).limit(50).toArray();

    const phrases = suggestions.map(suggest => {
      const uniques = suggest.term.split(/\s+/).reduce((h: Lookup, s: string) => {
        return h[s] = s, h;
      }, {} as Lookup);

      return Object.values(uniques).join(' ');
    }).reduce((h: Lookup, s: string) => {
      return h[s] = s, h;
    }, {} as Lookup);

    return Object.values(phrases);
  }

  const getPageText = async (pageId: string) => {
    const textDoc = await text.findOne({
      page: new ObjectId(pageId)
    });

    if (textDoc !== null) {
      return textDoc;
    }

    return {};
  }

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
    getPagesStream,
    getPagesByIds,
    getPageTexts,
    getPageTFStream,
    getMatchedPages,
    getSuggestions,
    getPage,
    getPageText,
    getSiteListings,
    getUpNext,
    getCooldown
  }
}