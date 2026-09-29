import {Worker} from 'node:worker_threads';
import {join} from 'node:path';

type MatchRange = {start: number, end: number};
type MatchResult = {ranges: MatchRange[][], errors: string[]};

const scanMatches = ( text: string, rules: unknown[], complete: ( result: MatchResult ) => void, failed: ( message: string ) => void ): (() => void) => {
  let worker: Worker | undefined;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    clearTimeout ( timer );
    void worker?.terminate ();
  };
  const fail = ( message: string ) => {
    if ( cancelled ) return;
    cancel ();
    failed ( message );
  };
  // Wait briefly for typing to pause before starting a cancellable scan.
  let timer = setTimeout ( () => {
    worker = new Worker ( join ( __dirname, 'matcher.js' ), {workerData: {text, rules}, resourceLimits: {maxOldGenerationSizeMb: 64}} );
    timer = setTimeout ( () => fail ( 'Matching took too long. Simplify your patterns or use a smaller document.' ), 1000 );
    worker.on ( 'message', ( result: MatchResult ) => {
      if ( cancelled ) return;
      cancel ();
      complete ( result );
    });
    worker.on ( 'error', error => fail ( `Matching failed: ${error.message}` ) );
    worker.on ( 'exit', () => fail ( 'Matching stopped before it could finish.' ) );
  }, 75 );
  return cancel;
};

export {scanMatches};
export type {MatchRange, MatchResult};
