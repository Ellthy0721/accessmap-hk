(function () {
  "use strict";

  self.window = self;
  const assetVersion = self.location.search || "";
  importScripts(
    `scripts/services/profile-service.js${assetVersion}`,
    `scripts/services/route-data-service.js${assetVersion}`,
    `scripts/services/route-service.js${assetVersion}`
  );

  const routeService = self.MapableRoutingService.create();
  let latestRequestId = 0;

  self.addEventListener("message", async (event) => {
    const request = event.data || {};
    if (request.type !== "plan" || !request.id) return;
    latestRequestId = request.id;
    try {
      const result = await routeService.plan(
        request.start,
        request.end,
        request.profileKey,
        {
          ...(request.planOptions || {}),
          isCurrent: () => request.id === latestRequestId
        }
      );
      self.postMessage({ type: "result", id: request.id, result });
    } catch (error) {
      self.postMessage({
        type: "error",
        id: request.id,
        message: error?.message || "Route planning failed"
      });
    }
  });
})();
