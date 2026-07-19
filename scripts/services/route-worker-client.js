(function () {
  "use strict";

  const routeWorkerClientSource = typeof document !== "undefined" ? document.currentScript?.src || "" : "";
  const routeWorkerAssetVersion = routeWorkerClientSource.match(/[?&]v=([^&#]+)/)?.[1] || "";

  function routeWorkerUrl() {
    return `route-worker.js${routeWorkerAssetVersion ? `?v=${routeWorkerAssetVersion}` : ""}`;
  }

  function create(fallbackFactory) {
    let fallbackService = null;
    let workerFailed = !window.Worker;
    let worker = null;
    let requestId = 0;
    const pending = new Map();

    function fallback() {
      if (!fallbackService) fallbackService = fallbackFactory();
      return fallbackService;
    }

    function completeWithFallback(request) {
      fallback().plan(...request.args).then(request.resolve, request.reject);
    }

    if (!workerFailed) {
      worker = new Worker(routeWorkerUrl());
      worker.addEventListener("message", (event) => {
        const response = event.data || {};
        const request = pending.get(response.id);
        if (!request) return;
        pending.delete(response.id);
        if (response.type === "result") request.resolve(response.result);
        else request.reject(new Error(response.message || "Route planning failed"));
      });
      worker.addEventListener("error", () => {
        workerFailed = true;
        worker.terminate();
        worker = null;
        const requests = [...pending.values()];
        pending.clear();
        requests.forEach(completeWithFallback);
      });
    }

    return {
      plan(start, end, profileKey, planOptions) {
        const args = [start, end, profileKey, planOptions];
        if (workerFailed) return fallback().plan(...args);
        return new Promise((resolve, reject) => {
          const id = ++requestId;
          pending.set(id, { args, resolve, reject });
          worker.postMessage({ type: "plan", id, start, end, profileKey, planOptions });
        });
      }
    };
  }

  window.MapableRouteWorkerClient = { create };
})();
