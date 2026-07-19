(function () {
  "use strict";

  const standardRouting = {
    walkSpeed: 70,
    maxWalk: 3200,
    path: { slope: 1.4, stairs: 1800, crossing: 40, ramp: 0.96 },
    ranking: { walk: 0.1, slope: 0.15, stairs: 6, crossing: 0.08, transfer: 1.5, fallback: 4, fare: 0.2, unknownFare: 2, waitExposure: 0.08 }
  };

  const profiles = {
    senior: profile({
      id: "senior", label: "長者", shortLabel: "長者", travelProfile: "senior", colorMode: "default", contrastMode: "standard",
      priorities: { walk: 3, stairs: 5, slope: 4, surface: 3, crossing: 3, transfer: 4, liftUnknown: 4, unknown: 4, wait: 4, fare: 2 },
      walkSpeed: 52, maxWalk: 2400,
      path: { slope: 2.2, stairs: 9000, crossing: 120, ramp: 0.86 },
      ranking: { walk: 0.45, slope: 0.7, stairs: 30, crossing: 0.3, transfer: 4, fallback: 8, fare: 0.15, unknownFare: 2, waitExposure: 0.2 }
    }),
    wheelchair: profile({
      id: "wheelchair", label: "輪椅人士", shortLabel: "輪椅", travelProfile: "wheelchair", colorMode: "default", contrastMode: "standard",
      priorities: { walk: 4, stairs: 5, slope: 5, surface: 5, crossing: 3, transfer: 5, liftUnknown: 5, unknown: 5, wait: 3, fare: 1 },
      hardConstraints: { knownStairs: true },
      walkSpeed: 48, maxWalk: 1900,
      path: { slope: 3.2, stairs: Infinity, crossing: 140, ramp: 0.7 },
      ranking: { walk: 0.55, slope: 1.2, stairs: Infinity, crossing: 0.35, transfer: 6, fallback: 15, fare: 0.08, unknownFare: 3, waitExposure: 0.15 }
    }),
    lowVision: profile({
      id: "lowVision", label: "視障", shortLabel: "視障", travelProfile: "lowVision", colorMode: "default", contrastMode: "highContrast",
      priorities: { walk: 3, stairs: 4, slope: 3, surface: 4, crossing: 5, transfer: 4, liftUnknown: 3, unknown: 5, wait: 3, fare: 1 },
      walkSpeed: 50, maxWalk: 2100,
      path: { slope: 2.1, stairs: 8500, crossing: 420, ramp: 0.9 },
      ranking: { walk: 0.4, slope: 0.6, stairs: 28, crossing: 1.2, transfer: 5, fallback: 12, fare: 0.1, unknownFare: 3, waitExposure: 0.15 }
    }),
    colorVision: profile({
      id: "colorVision", label: "色弱", shortLabel: "色弱", travelProfile: "standard", colorMode: "redGreen", contrastMode: "standard",
      priorities: { walk: 1, stairs: 1, slope: 1, surface: 1, crossing: 1, transfer: 1, liftUnknown: 1, unknown: 2, wait: 1, fare: 2 },
      ...standardRouting
    }),
    stroller: profile({
      id: "stroller", label: "嬰兒車／照顧者", shortLabel: "嬰兒車", travelProfile: "stroller", colorMode: "default", contrastMode: "standard",
      priorities: { walk: 3, stairs: 5, slope: 4, surface: 4, crossing: 3, transfer: 4, liftUnknown: 5, unknown: 5, wait: 3, fare: 1 },
      walkSpeed: 50, maxWalk: 2100,
      path: { slope: 2.6, stairs: 14000, crossing: 120, ramp: 0.78 },
      ranking: { walk: 0.45, slope: 1, stairs: 45, crossing: 0.3, transfer: 5, fallback: 14, fare: 0.1, unknownFare: 3, waitExposure: 0.15 }
    }),
    standard: profile({
      id: "standard", label: "一般模式", shortLabel: "一般", travelProfile: "standard", colorMode: "default", contrastMode: "standard",
      priorities: { walk: 1, stairs: 1, slope: 1, surface: 1, crossing: 1, transfer: 1, liftUnknown: 1, unknown: 2, wait: 2, fare: 3 },
      ...standardRouting
    })
  };

  function profile(config) {
    return {
      hardConstraints: { knownStairs: false, ...(config.hardConstraints || {}) },
      ...config
    };
  }

  function resolve(key) {
    return profiles[key] || profiles.senior;
  }

  function list() {
    return Object.values(profiles);
  }

  function selection(key) {
    const selected = resolve(key);
    return {
      profileKey: selected.id,
      travelProfile: selected.travelProfile,
      colorMode: selected.colorMode,
      contrastMode: selected.contrastMode
    };
  }

  function candidateFacts(option) {
    const walkSegments = (option?.segments || []).filter((segment) => segment.mode === "walk");
    const metrics = option?.metrics || mergeMetrics(walkSegments.map((segment) => segment.metrics));
    const connectedRamps = Number(metrics.connectedRamps ?? metrics.ramps) || 0;
    const connectedLifts = Number(metrics.connectedLifts ?? metrics.lifts) || 0;
    const fallback = walkSegments.some((segment) => segment.metrics?.fallback || segment.routed === false) || Boolean(metrics.fallback);
    const criticalAccessUnknown = fallback || Boolean(metrics.stairsUnknown) || Boolean(metrics.entranceConnectionUnknown)
      || Boolean(metrics.unknownSurface) || Boolean(metrics.unknownWidth) || Boolean(metrics.unknownCurb);
    return {
      stairs: Number(metrics.stairs) || 0,
      slopes: Number(metrics.slopes) || 0,
      ramps: connectedRamps,
      lifts: connectedLifts,
      connectedRamps,
      connectedLifts,
      nearbyRamps: Number(metrics.nearbyRamps) || 0,
      nearbyLifts: Number(metrics.nearbyLifts) || 0,
      crossings: Number(metrics.crossings) || 0,
      stairsUnknown: Boolean(metrics.stairsUnknown),
      entranceConnectionUnknown: Boolean(metrics.entranceConnectionUnknown),
      unknownSurface: Boolean(metrics.unknownSurface),
      unknownWidth: Boolean(metrics.unknownWidth),
      unknownCurb: Boolean(metrics.unknownCurb),
      unknownSlopeDetails: Boolean(metrics.unknownSlopeDetails),
      unknownCrossingAssist: Boolean(metrics.unknownCrossingAssist),
      criticalAccessUnknown,
      fallback,
      transfers: Math.max(0, (option?.segments || []).filter((segment) => segment.mode !== "walk").length - 1)
    };
  }

  function hardConstraintStatus(option, profileKey) {
    const selected = resolve(profileKey);
    const facts = candidateFacts(option);
    if (selected.hardConstraints.knownStairs && facts.stairs > 0) {
      return { status: "rejected", reason: "known-stairs", facts };
    }
    if (selected.id === "wheelchair" && facts.criticalAccessUnknown) {
      return { status: "pending", reason: "critical-access-unknown", facts };
    }
    return { status: "eligible", reason: "", facts };
  }

  function explain(option, baseline, profileKey) {
    const selected = resolve(profileKey);
    const facts = candidateFacts(option);
    const baselineFacts = baseline ? candidateFacts(baseline) : null;
    const reliableStairComparison = Boolean(baselineFacts && !facts.fallback && !baselineFacts.fallback
      && !facts.stairsUnknown && !baselineFacts.stairsUnknown);
    const reliableCrossingComparison = Boolean(baselineFacts && !facts.fallback && !baselineFacts.fallback
      && !facts.unknownCrossingAssist && !baselineFacts.unknownCrossingAssist);
    const avoidedStairs = reliableStairComparison ? Math.max(0, baselineFacts.stairs - facts.stairs) : 0;
    const reducedCrossings = reliableCrossingComparison ? Math.max(0, baselineFacts.crossings - facts.crossings) : 0;
    const connectedAccess = [
      facts.connectedLifts ? `使用 ${facts.connectedLifts} 處升降機` : "",
      facts.connectedRamps ? `使用 ${facts.connectedRamps} 處斜道` : ""
    ].filter(Boolean).join("，");
    const nearbyAccess = [
      facts.nearbyLifts ? `附近有 ${facts.nearbyLifts} 處升降機標記` : "",
      facts.nearbyRamps ? `附近有 ${facts.nearbyRamps} 處斜道標記` : ""
    ].filter(Boolean).join("，");
    const accessText = [connectedAccess, nearbyAccess].filter(Boolean).join("；");
    const hasOtherUnknown = facts.unknownSlopeDetails || facts.unknownCrossingAssist;
    let primary = "";
    let secondary = "";

    if (selected.id === "standard") return { primary, secondary, facts, comparison: null };
    if (selected.id === "colorVision") {
      primary = "色弱模式：路線排序沿用一般模式，不會把所有燈控過路處一律視為不便。";
      secondary = "可選紅綠色覺或藍黃色覺顯示；高對比顯示在設定中獨立控制。地圖路線同時使用文字、描邊和線型區分。";
    } else if (selected.id === "wheelchair") {
      primary = facts.criticalAccessUnknown
        ? "輪椅路線：此選擇只列作待核實路線，暫不標示為全程無障礙。"
        : `輪椅路線：已知步行路段未發現樓梯${connectedAccess ? `，${connectedAccess}` : ""}。`;
      if (facts.criticalAccessUnknown) secondary = "入口、路面、通道闊度或路緣資料未完整，實際通行情況待確認。";
      else if (nearbyAccess) secondary = `${nearbyAccess}，未確認為路線實際使用的連接。`;
    } else if (selected.id === "lowVision") {
      primary = reducedCrossings
        ? `視障路線：相比一般路線減少 ${reducedCrossings} 個已知複雜過路處。`
        : "視障路線：優先避開複雜過路、頻繁轉乘和通行資料不完整的路段。";
      if (facts.fallback || facts.unknownCrossingAssist) secondary = "此路線的過路輔助設施及部分步行連接資料待確認。";
    } else {
      const prefix = selected.id === "senior" ? "長者路線" : "嬰兒車路線";
      primary = avoidedStairs
        ? `${prefix}：相比一般路線避開 ${avoidedStairs} 處已知樓梯${accessText ? `，${accessText}` : ""}。`
        : `${prefix}：優先避開樓梯、較陡斜坡、過長連續步行和頻繁轉乘${accessText ? `；${accessText}` : ""}。`;
      if (facts.slopes) secondary = `有 ${facts.slopes} 段已標示斜坡，建議慢行。`;
      if (facts.fallback || facts.criticalAccessUnknown || hasOtherUnknown) secondary = "有步行通行資料待確認，暫不作無障礙保證。";
    }

    return {
      primary,
      secondary,
      facts,
      comparison: baselineFacts ? { avoidedStairs, reducedCrossings, baselineOptionId: baseline.id || "" } : null
    };
  }

  function mergeMetrics(metricsList) {
    return (metricsList || []).filter(Boolean).reduce((total, metrics) => ({
      stairs: total.stairs + (Number(metrics.stairs) || 0),
      slopes: total.slopes + (Number(metrics.slopes) || 0),
      ramps: total.ramps + (Number(metrics.ramps) || 0),
      lifts: total.lifts + (Number(metrics.lifts) || 0),
      connectedRamps: total.connectedRamps + (Number(metrics.connectedRamps ?? metrics.ramps) || 0),
      connectedLifts: total.connectedLifts + (Number(metrics.connectedLifts ?? metrics.lifts) || 0),
      nearbyRamps: total.nearbyRamps + (Number(metrics.nearbyRamps) || 0),
      nearbyLifts: total.nearbyLifts + (Number(metrics.nearbyLifts) || 0),
      crossings: total.crossings + (Number(metrics.crossings) || 0),
      stairsUnknown: total.stairsUnknown || Boolean(metrics.stairsUnknown),
      entranceConnectionUnknown: total.entranceConnectionUnknown || Boolean(metrics.entranceConnectionUnknown),
      unknownSurface: total.unknownSurface || Boolean(metrics.unknownSurface),
      unknownWidth: total.unknownWidth || Boolean(metrics.unknownWidth),
      unknownCurb: total.unknownCurb || Boolean(metrics.unknownCurb),
      unknownSlopeDetails: total.unknownSlopeDetails || Boolean(metrics.unknownSlopeDetails),
      unknownCrossingAssist: total.unknownCrossingAssist || Boolean(metrics.unknownCrossingAssist),
      fallback: total.fallback || Boolean(metrics.fallback)
    }), {
      stairs: 0, slopes: 0, ramps: 0, lifts: 0, connectedRamps: 0, connectedLifts: 0,
      nearbyRamps: 0, nearbyLifts: 0, crossings: 0, stairsUnknown: false,
      entranceConnectionUnknown: false, unknownSurface: false, unknownWidth: false,
      unknownCurb: false, unknownSlopeDetails: false, unknownCrossingAssist: false, fallback: false
    });
  }

  window.MapableProfileService = { list, resolve, selection, candidateFacts, hardConstraintStatus, explain };
})();
