import { removeStopwords } from 'stopword';
import { WordTokenizer, NGrams } from 'natural';
import { TermMatch } from './types';
import { ObjectId } from 'mongodb';

const punctuation = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g;
const spaces = /\s+/g;
const newlines = /(\r\n|\n|\r)/gm;

export const cleanText = (text: string) => {
  return text.replace(spaces, ' ')
    .replace(punctuation, ' ')
    .replace(newlines, ' ')
    .trim();
}

export const prepareTerm = (term: string) => {
  const tokenizer = new WordTokenizer();
  const termTokens = tokenizer.tokenize(cleanText(term.toLowerCase()));
  const noStops = removeStopwords(termTokens);
  const ngrams = (noStops.length > 3
    ? NGrams.trigrams(noStops, '', '').map(n => {
      return n.filter(t => t.length).join(' ');
    })
    : noStops
  );

  return ngrams;
}

export const scoreMatches = (terms: Array<String>, matches: Array<TermMatch>, total: number): Array<ObjectId> => {
  const idf = 1 + Math.log(
    total /
    (1 + matches.length)
  );

  return matches.map((doc) => {
    const sum = terms.map((token) => {
      if (doc.term === token) {
        return doc.score;
      }

      return 0;
    }).reduce((s, w) => s + w, 0);

    return {
      id: doc.page,
      score: sum * idf
    };
  }).sort((a, b) => b.score - a.score).slice(0, 50).map(doc => {
    return doc.id;
  });
}

