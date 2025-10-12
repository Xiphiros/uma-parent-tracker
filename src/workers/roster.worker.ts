import { RosterWorkerPayload } from '../types';

self.onmessage = (e: MessageEvent<RosterWorkerPayload>) => {
  const { type, data } = e.data;

  switch (type) {
    case 'INIT': {
      // TODO: Store initial data (inventory, master data)
      console.log('Worker initialized with data.');
      break;
    }
    case 'UPDATE': {
      // TODO: Perform filtering, sorting, and top-pair calculation
      console.log('Worker received update request.');
      // Post a dummy message for now
      self.postMessage({ sortedParentIds: [], topBreedingPairs: [] });
      break;
    }
  }
};