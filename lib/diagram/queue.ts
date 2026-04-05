type Job<T> = () => Promise<T>;

let chain: Promise<void> = Promise.resolve();
let pending = 0;

export const DEFAULT_MAX_QUEUE = 3;

export function enqueue<T>(job: Job<T>, maxQueue = DEFAULT_MAX_QUEUE): Promise<T> {
  if (pending >= maxQueue) {
    const err: any = new Error("Queue full");
    err.code = "QUEUE_FULL";
    throw err;
  }

  pending++;

  const run = async () => {
    try {
      return await job();
    } finally {
      pending--;
    }
  };

  const result = chain.then(run, run);
  chain = result.then(() => undefined, () => undefined);
  return result;
}
