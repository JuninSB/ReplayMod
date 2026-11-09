// Shared asset jobs prevent repeated downloads during geometry/UI rebuilds.
export class AssetLoads {
  constructor(onChange = () => {}, concurrency = 6, onRecovered = () => {}) {
    this.jobs = new Map();
    this.scene = new Set();
    this.queue = [];
    this.running = 0;
    this.onChange = onChange;
    this.concurrency = concurrency;
    this.onRecovered = onRecovered;
  }
  beginScene() {
    this.scene.clear();
    for (const job of this.jobs.values()) job.listeners.clear();
    this.onChange();
  }
  load(key, kind, loader, { onValue, optional = false } = {}) {
    let job = this.jobs.get(key);
    if (!job) {
      job = {
        key,
        kind,
        loader,
        optional,
        state: "queued",
        listeners: new Set(),
      };
      this.jobs.set(key, job);
      this.queue.push(job);
    }
    this.scene.add(key);
    if (onValue) {
      job.listeners.add(onValue);
      if (job.state === "ready") onValue(job.value);
      else if (job.state === "failed") onValue(null);
    }
    this.onChange();
    this.pump();
    return job;
  }
  pump() {
    while (this.running < this.concurrency && this.queue.length) {
      const job = this.queue.shift();
      this.running++;
      job.state = "loading";
      this.onChange();
      this.run(job).finally(() => {
        this.running--;
        this.onChange();
        this.pump();
      });
    }
  }
  async run(job) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const value = await job.loader(attempt);
        if (value == null) throw new Error("Empty asset");
        job.value = value;
        job.state = "ready";
        job.error = "";
        for (const listener of job.listeners) {
          try {
            listener(value);
          } catch (error) {
            console.warn("Asset application failed", job.key, error);
          }
        }
        if (job.wasFailed) {
          job.wasFailed = false;
          this.onRecovered(job);
        }
        return;
      } catch (error) {
        job.error = error?.message || String(error);
      }
    }
    job.state = "failed";
    for (const listener of job.listeners) {
      try {
        listener(null);
      } catch {}
    }
  }
  retryFailed() {
    for (const key of this.scene) {
      const job = this.jobs.get(key);
      if (job.state === "failed" && !job.optional) {
        job.state = "queued";
        job.wasFailed = true;
        this.queue.push(job);
      }
    }
    this.onChange();
    this.pump();
  }
  summary() {
    const counts = {
      mesh: { ready: 0, total: 0 },
      texture: { ready: 0, total: 0 },
      pending: 0,
      failures: [],
    };
    for (const key of this.scene) {
      const job = this.jobs.get(key),
        group = counts[job.kind];
      group.total++;
      if (job.state === "ready" || (job.optional && job.state === "failed"))
        group.ready++;
      if (job.state === "loading" || job.state === "queued") counts.pending++;
      if (job.state === "failed" && !job.optional)
        counts.failures.push({
          key: job.key,
          error: job.error,
          kind: job.kind,
        });
    }
    return counts;
  }
}
