import {parentPort, workerData} from 'node:worker_threads';
import type {MatchRange, MatchResult} from './matches';

const {text, rules} = workerData as {text: string, rules: unknown[]};
const result: MatchResult = {ranges: [], errors: []};
const occupied: MatchRange[] = [];

for ( const [index, value] of rules.entries () ) {
  const ranges: MatchRange[] = [];
  result.ranges.push ( ranges );
  try {
    const rule = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
    if ( typeof rule.pattern !== 'string' || !rule.pattern ) throw new Error ( 'pattern must be a non-empty string' );
    const flags = rule.flags === undefined ? 'u' : rule.flags;
    if ( typeof flags !== 'string' || !/^[gimsu]*$/.test ( flags ) ) throw new Error ( 'flags may only contain g, i, m, s, and u' );
    const regex = new RegExp ( rule.pattern, flags.includes ( 'g' ) ? flags : `${flags}g` );
    let cursor = 0;
    for ( const match of text.matchAll ( regex ) ) {
      if ( !match[0].length ) continue;
      const start = match.index;
      const end = start + match[0].length;
      while ( cursor < occupied.length && occupied[cursor].end <= start ) cursor++;
      // Keep an earlier match intact, including any connecting spaces.
      if ( cursor < occupied.length && occupied[cursor].start < end ) continue;
      ranges.push ({start, end});
    }
    for ( const range of ranges ) occupied.push ( range );
    occupied.sort ( ( first, second ) => first.start - second.start );
  } catch ( error ) {
    result.errors.push ( `Rule ${index + 1}: ${error instanceof Error ? error.message : String ( error )}` );
  }
}

parentPort?.postMessage ( result );
