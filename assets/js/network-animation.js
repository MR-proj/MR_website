(() => {
  const root = document.querySelector(
    ".one-page-section--home .network-card, .home-page .network-card"
  );
  const svg = root?.querySelector(".home-network-svg");

  if (!root || !svg || root.dataset.animationInitialised === "true") {
    return;
  }

  root.dataset.animationInitialised = "true";

  const reducedMotionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };

  const permanentEdgeLayer = svg.querySelector("#network-edges-permanent");
  const dynamicEdgeLayer = svg.querySelector("#network-edges-dynamic");
  const permanentNodeLayer = svg.querySelector("#network-nodes-permanent");

  if (!permanentEdgeLayer || !dynamicEdgeLayer || !permanentNodeLayer) {
    return;
  }

  const MOBILE_BREAKPOINT = 768;
  const STATIC_BREAKPOINT = 480;
  const DYNAMIC_CREATE_DISTANCE = 92;
  const DYNAMIC_REMOVE_DISTANCE = 118;
  const DYNAMIC_MAX_TOTAL = 10;
  const DYNAMIC_MAX_PER_NODE = 2;
  const DYNAMIC_CHECK_INTERVAL = 0.3;
  const DYNAMIC_MIN_LIFETIME = 1.2;
  const TAU = Math.PI * 2;

  const state = {
    animationFrameId: null,
    clockStart: 0,
    lastTimestamp: 0,
    pausedAt: 0,
    logicalSeconds: 0,
    dynamicAccumulator: 0,
    motionMode: "desktop",
    reducedMotionActive: reducedMotionQuery.matches,
    resizeTimerId: null,
    nodeStates: [],
    nodeMap: new Map(),
    permanentEdges: [],
    permanentEdgeKeys: new Set(),
    dynamicEdges: new Map(),
    dynamicDegrees: new Map(),
    started: false,
    groupDriftConfig: {
      egalitarian: {
        ampX: 1.5,
        ampY: 1.3,
        speedX: TAU / 11.5,
        speedY: TAU / 12.6,
        phaseX: 0.2,
        phaseY: 1.1
      },
      hierarchical: {
        ampX: 0.8,
        ampY: 0.7,
        speedX: TAU / 13.5,
        speedY: TAU / 14.4,
        phaseX: 1.3,
        phaseY: 0.6
      },
      modularA: {
        ampX: 1.6,
        ampY: 1.4,
        speedX: TAU / 11.8,
        speedY: TAU / 13.2,
        phaseX: 0.7,
        phaseY: 1.8
      },
      modularB: {
        ampX: 1.5,
        ampY: 1.7,
        speedX: TAU / 12.4,
        speedY: TAU / 10.9,
        phaseX: 1.9,
        phaseY: 0.9
      }
    }
  };

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  const getCanonicalEdgeKey = (sourceId, targetId) =>
    [sourceId, targetId].sort((left, right) => left.localeCompare(right)).join("::");
  const getDistance = (leftNode, rightNode) =>
    Math.hypot(leftNode.currentX - rightNode.currentX, leftNode.currentY - rightNode.currentY);
  const getApproachFactor = (deltaTime, rate) => 1 - Math.exp(-deltaTime * rate);

  const getMotionMode = () => {
    if (state.reducedMotionActive) {
      return "reduced";
    }

    if (window.innerWidth < STATIC_BREAKPOINT) {
      return "static";
    }

    if (window.innerWidth < MOBILE_BREAKPOINT) {
      return "mobile";
    }

    return "desktop";
  };

  const validateEdgeEndpoints = (sourceNode, targetNode) =>
    Boolean(sourceNode && targetNode && sourceNode.id && targetNode.id && sourceNode.id !== targetNode.id);

  const buildBaseMotion = (group, role, index) => {
    if (group === "egalitarian") {
      return {
        amplitudeX: 2.6 + (index % 3) * 0.45,
        amplitudeY: 2.5 + ((index + 1) % 3) * 0.45,
        speedX: TAU / (10 + (index % 4) * 0.55),
        speedY: TAU / (11 + ((index + 2) % 4) * 0.5)
      };
    }

    if (group === "hierarchical") {
      if (role === "hub") {
        return {
          amplitudeX: 1,
          amplitudeY: 0.9,
          speedX: TAU / 13.6,
          speedY: TAU / 14.4
        };
      }

      if (role === "intermediate") {
        return {
          amplitudeX: 2.2 + (index % 2) * 0.45,
          amplitudeY: 2.1 + ((index + 1) % 2) * 0.4,
          speedX: TAU / (10.1 + index * 0.25),
          speedY: TAU / (11.1 + index * 0.2)
        };
      }

      return {
        amplitudeX: 3.2 + (index % 3) * 0.4,
        amplitudeY: 3.1 + ((index + 1) % 3) * 0.45,
        speedX: TAU / (9.2 + (index % 4) * 0.45),
        speedY: TAU / (10.3 + ((index + 2) % 4) * 0.4)
      };
    }

    if (group === "modular") {
      if (role === "broker") {
        return {
          amplitudeX: 3.3 + (index % 2) * 0.35,
          amplitudeY: 3 + ((index + 1) % 2) * 0.45,
          speedX: TAU / (10.4 + index * 0.2),
          speedY: TAU / (11.8 + index * 0.22)
        };
      }

      return {
        amplitudeX: 2.3 + (index % 3) * 0.35,
        amplitudeY: 2.2 + ((index + 2) % 3) * 0.35,
        speedX: TAU / (10.8 + (index % 4) * 0.45),
        speedY: TAU / (11.9 + ((index + 1) % 4) * 0.4)
      };
    }

    return {
      amplitudeX: 1.8 + (index % 2) * 0.4,
      amplitudeY: 1.7 + ((index + 1) % 2) * 0.35,
      speedX: TAU / (11.8 + (index % 3) * 0.4),
      speedY: TAU / (12.8 + ((index + 1) % 3) * 0.4)
    };
  };

  const scaleMotionForViewport = (nodeState, baseMotion) => {
    if (state.motionMode === "mobile") {
      return {
        amplitudeX: baseMotion.amplitudeX * 0.66,
        amplitudeY: baseMotion.amplitudeY * 0.66,
        speedX: baseMotion.speedX,
        speedY: baseMotion.speedY
      };
    }

    let scale = 1;

    if (window.innerWidth <= 1040) {
      scale = 0.88;
    } else if (window.innerWidth <= 1280) {
      scale = 0.94;
    }

    return {
      amplitudeX: baseMotion.amplitudeX * scale,
      amplitudeY: baseMotion.amplitudeY * scale,
      speedX: baseMotion.speedX,
      speedY: baseMotion.speedY
    };
  };

  const initialiseNodes = () => {
    const elements = Array.from(permanentNodeLayer.querySelectorAll("[data-node-id]"));

    state.nodeStates = elements.map((element, index) => {
      const group = element.getAttribute("data-group") || "egalitarian";
      const role = element.getAttribute("data-role") || "member";
      const baseMotion = buildBaseMotion(group, role, index);

      return {
        id: element.getAttribute("data-node-id"),
        element,
        group,
        role,
        cluster: element.getAttribute("data-cluster") || "",
        anchorX: Number(element.getAttribute("cx")),
        anchorY: Number(element.getAttribute("cy")),
        currentX: Number(element.getAttribute("cx")),
        currentY: Number(element.getAttribute("cy")),
        baseMotion,
        motion: baseMotion,
        phaseX: index * 0.57,
        phaseY: index * 0.49 + 0.82
      };
    });

    state.nodeMap = new Map(state.nodeStates.map((nodeState) => [nodeState.id, nodeState]));
    updateNodeMotionScales();
  };

  const initialisePermanentEdges = () => {
    const edgeElements = Array.from(permanentEdgeLayer.querySelectorAll("[data-source][data-target]"));

    state.permanentEdges = edgeElements
      .map((element) => {
        const sourceNode = state.nodeMap.get(element.getAttribute("data-source"));
        const targetNode = state.nodeMap.get(element.getAttribute("data-target"));

        if (!validateEdgeEndpoints(sourceNode, targetNode)) {
          return null;
        }

        const key = getCanonicalEdgeKey(sourceNode.id, targetNode.id);
        state.permanentEdgeKeys.add(key);

        return {
          element,
          sourceNode,
          targetNode,
          key
        };
      })
      .filter(Boolean);
  };

  const updateNodeMotionScales = () => {
    state.nodeStates.forEach((nodeState) => {
      nodeState.motion = scaleMotionForViewport(nodeState, nodeState.baseMotion);
    });
  };

  const resetNodePositionsToAnchors = () => {
    state.nodeStates.forEach((nodeState) => {
      nodeState.currentX = nodeState.anchorX;
      nodeState.currentY = nodeState.anchorY;
      nodeState.element.setAttribute("cx", nodeState.anchorX.toFixed(2));
      nodeState.element.setAttribute("cy", nodeState.anchorY.toFixed(2));
    });
  };

  const updatePermanentEdgePositions = () => {
    state.permanentEdges.forEach((edgeState) => {
      edgeState.element.setAttribute("x1", edgeState.sourceNode.currentX.toFixed(2));
      edgeState.element.setAttribute("y1", edgeState.sourceNode.currentY.toFixed(2));
      edgeState.element.setAttribute("x2", edgeState.targetNode.currentX.toFixed(2));
      edgeState.element.setAttribute("y2", edgeState.targetNode.currentY.toFixed(2));
    });
  };

  const getSharedDrift = (nodeState, elapsedSeconds) => {
    if (nodeState.group === "free-agent") {
      return { x: 0, y: 0 };
    }

    if (nodeState.group === "hierarchical") {
      const config = state.groupDriftConfig.hierarchical;
      return {
        x: Math.sin(elapsedSeconds * config.speedX + config.phaseX) * config.ampX,
        y: Math.cos(elapsedSeconds * config.speedY + config.phaseY) * config.ampY
      };
    }

    if (nodeState.group === "modular") {
      const config =
        nodeState.cluster === "module-b"
          ? state.groupDriftConfig.modularB
          : state.groupDriftConfig.modularA;

      return {
        x: Math.sin(elapsedSeconds * config.speedX + config.phaseX) * config.ampX,
        y: Math.cos(elapsedSeconds * config.speedY + config.phaseY) * config.ampY
      };
    }

    const config = state.groupDriftConfig.egalitarian;
    return {
      x: Math.sin(elapsedSeconds * config.speedX + config.phaseX) * config.ampX,
      y: Math.cos(elapsedSeconds * config.speedY + config.phaseY) * config.ampY
    };
  };

  const getFreeAgentPosition = (nodeState, elapsedSeconds) => {
    const scale = state.motionMode === "mobile" ? 0.55 : 1;

    if (nodeState.id === "node-fa1") {
      return {
        x:
          470 +
          Math.sin(TAU * elapsedSeconds / 48) * 125 * scale +
          (Math.sin(TAU * elapsedSeconds / 21 + 0.5) - Math.sin(0.5)) * 18 * scale,
        y:
          114 +
          Math.sin(TAU * elapsedSeconds / 39) * 58 * scale +
          (Math.sin(TAU * elapsedSeconds / 27 + 1.1) - Math.sin(1.1)) * 12 * scale
      };
    }

    return {
      x:
        500 +
        Math.sin(TAU * elapsedSeconds / 54) * 135 * scale +
        (Math.sin(TAU * elapsedSeconds / 25 + 1.4) - Math.sin(1.4)) * 16 * scale,
      y:
        190 +
        Math.sin(TAU * elapsedSeconds / 43) * 62 * scale +
        (Math.sin(TAU * elapsedSeconds / 31 + 0.7) - Math.sin(0.7)) * 12 * scale
    };
  };

  const updateNodePositions = (elapsedSeconds) => {
    state.nodeStates.forEach((nodeState) => {
      if (nodeState.group === "free-agent") {
        const freeAgentPosition = getFreeAgentPosition(nodeState, elapsedSeconds);
        nodeState.currentX = freeAgentPosition.x;
        nodeState.currentY = freeAgentPosition.y;
      } else {
        const shared = getSharedDrift(nodeState, elapsedSeconds);
        const localX =
          Math.sin(elapsedSeconds * nodeState.motion.speedX + nodeState.phaseX) * nodeState.motion.amplitudeX;
        const localY =
          Math.cos(elapsedSeconds * nodeState.motion.speedY + nodeState.phaseY) * nodeState.motion.amplitudeY;

        nodeState.currentX = nodeState.anchorX + shared.x + localX;
        nodeState.currentY = nodeState.anchorY + shared.y + localY;
      }

      nodeState.element.setAttribute("cx", nodeState.currentX.toFixed(2));
      nodeState.element.setAttribute("cy", nodeState.currentY.toFixed(2));
    });
  };

  const incrementDynamicDegree = (nodeId) => {
    state.dynamicDegrees.set(nodeId, (state.dynamicDegrees.get(nodeId) || 0) + 1);
  };

  const decrementDynamicDegree = (nodeId) => {
    const nextValue = (state.dynamicDegrees.get(nodeId) || 1) - 1;

    if (nextValue <= 0) {
      state.dynamicDegrees.delete(nodeId);
      return;
    }

    state.dynamicDegrees.set(nodeId, nextValue);
  };

  const createDynamicEdge = (sourceNode, targetNode, logicalSeconds) => {
    const canonicalKey = getCanonicalEdgeKey(sourceNode.id, targetNode.id);
    const involvesFreeAgent =
      sourceNode.group === "free-agent" || targetNode.group === "free-agent";
    const edgeElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const targetOpacity = involvesFreeAgent ? 0.22 : 0.16;

    edgeElement.setAttribute("class", "network-edge network-edge-dynamic");
    edgeElement.setAttribute("data-source", sourceNode.id);
    edgeElement.setAttribute("data-target", targetNode.id);
    edgeElement.setAttribute("data-involves-free-agent", involvesFreeAgent ? "true" : "false");
    edgeElement.setAttribute("stroke", involvesFreeAgent ? "#8A7B58" : "#315C63");
    edgeElement.setAttribute("stroke-width", involvesFreeAgent ? "1" : "0.9");
    edgeElement.setAttribute("stroke-opacity", "0");
    dynamicEdgeLayer.appendChild(edgeElement);

    const edgeState = {
      canonicalKey,
      element: edgeElement,
      sourceNode,
      targetNode,
      involvesFreeAgent,
      createdAt: logicalSeconds,
      opacity: 0,
      targetOpacity,
      isFadingOut: false
    };

    state.dynamicEdges.set(canonicalKey, edgeState);
    incrementDynamicDegree(sourceNode.id);
    incrementDynamicDegree(targetNode.id);
  };

  const startDynamicFadeOut = (edgeState) => {
    edgeState.isFadingOut = true;
    edgeState.targetOpacity = 0;
  };

  const clearDynamicEdgesImmediate = () => {
    state.dynamicEdges.forEach((edgeState) => {
      edgeState.element.remove();
    });
    state.dynamicEdges.clear();
    state.dynamicDegrees.clear();
    dynamicEdgeLayer.replaceChildren();
  };

  const removeDynamicEdge = (edgeState) => {
    edgeState.element.remove();
    state.dynamicEdges.delete(edgeState.canonicalKey);
    decrementDynamicDegree(edgeState.sourceNode.id);
    decrementDynamicDegree(edgeState.targetNode.id);
  };

  const updateDynamicEdges = (deltaTime, logicalSeconds) => {
    const fadeFactor = getApproachFactor(deltaTime, 8);

    state.dynamicEdges.forEach((edgeState) => {
      if (!validateEdgeEndpoints(edgeState.sourceNode, edgeState.targetNode)) {
        startDynamicFadeOut(edgeState);
      }

      edgeState.element.setAttribute("x1", edgeState.sourceNode.currentX.toFixed(2));
      edgeState.element.setAttribute("y1", edgeState.sourceNode.currentY.toFixed(2));
      edgeState.element.setAttribute("x2", edgeState.targetNode.currentX.toFixed(2));
      edgeState.element.setAttribute("y2", edgeState.targetNode.currentY.toFixed(2));

      edgeState.opacity += (edgeState.targetOpacity - edgeState.opacity) * fadeFactor;
      edgeState.element.setAttribute("stroke-opacity", edgeState.opacity.toFixed(3));

      if (edgeState.isFadingOut && edgeState.opacity < 0.01) {
        removeDynamicEdge(edgeState);
      }
    });

    if (state.motionMode !== "desktop") {
      clearDynamicEdgesImmediate();
      return;
    }

    state.dynamicAccumulator += deltaTime;

    if (state.dynamicAccumulator < DYNAMIC_CHECK_INTERVAL) {
      return;
    }

    state.dynamicAccumulator = 0;

    state.dynamicEdges.forEach((edgeState) => {
      const age = logicalSeconds - edgeState.createdAt;
      const distance = getDistance(edgeState.sourceNode, edgeState.targetNode);

      if (distance > DYNAMIC_REMOVE_DISTANCE && age >= DYNAMIC_MIN_LIFETIME) {
        startDynamicFadeOut(edgeState);
        return;
      }

      if (edgeState.isFadingOut && distance < DYNAMIC_CREATE_DISTANCE) {
        edgeState.isFadingOut = false;
        edgeState.targetOpacity = edgeState.involvesFreeAgent ? 0.22 : 0.16;
      }
    });

    const degreeSnapshot = new Map(state.dynamicDegrees);
    let usedSlots = state.dynamicEdges.size;
    const candidates = [];

    for (let sourceIndex = 0; sourceIndex < state.nodeStates.length - 1; sourceIndex += 1) {
      const sourceNode = state.nodeStates[sourceIndex];

      for (let targetIndex = sourceIndex + 1; targetIndex < state.nodeStates.length; targetIndex += 1) {
        const targetNode = state.nodeStates[targetIndex];

        if (!validateEdgeEndpoints(sourceNode, targetNode)) {
          continue;
        }

        const canonicalKey = getCanonicalEdgeKey(sourceNode.id, targetNode.id);

        if (state.permanentEdgeKeys.has(canonicalKey) || state.dynamicEdges.has(canonicalKey)) {
          continue;
        }

        const distance = getDistance(sourceNode, targetNode);

        if (distance >= DYNAMIC_CREATE_DISTANCE) {
          continue;
        }

        const involvesFreeAgent =
          sourceNode.group === "free-agent" || targetNode.group === "free-agent";

        candidates.push({
          canonicalKey,
          sourceNode,
          targetNode,
          involvesFreeAgent,
          score: distance - (involvesFreeAgent ? 24 : 0)
        });
      }
    }

    candidates.sort((left, right) => left.score - right.score || left.canonicalKey.localeCompare(right.canonicalKey));

    const canAllocate = (candidate, degreeMap, activeCount) => {
      if (activeCount >= DYNAMIC_MAX_TOTAL) {
        return false;
      }

      return (
        (degreeMap.get(candidate.sourceNode.id) || 0) < DYNAMIC_MAX_PER_NODE &&
        (degreeMap.get(candidate.targetNode.id) || 0) < DYNAMIC_MAX_PER_NODE
      );
    };

    const chosenKeys = new Set();
    const chosenCandidates = [];
    const freeAgentIds = ["node-fa1", "node-fa2"];
    const freeAgentCandidateMap = new Map(
      freeAgentIds.map((freeAgentId) => [
        freeAgentId,
        candidates.filter(
          (candidate) =>
            candidate.sourceNode.id === freeAgentId || candidate.targetNode.id === freeAgentId
        )
      ])
    );

    const reserveFreeAgents = freeAgentIds.every(
      (freeAgentId) => (freeAgentCandidateMap.get(freeAgentId) || []).length > 0
    );

    if (reserveFreeAgents) {
      freeAgentIds.forEach((freeAgentId) => {
        const freeAgentCandidate = freeAgentCandidateMap
          .get(freeAgentId)
          .find(
            (candidate) =>
              !chosenKeys.has(candidate.canonicalKey) &&
              canAllocate(candidate, degreeSnapshot, usedSlots)
          );

        if (!freeAgentCandidate) {
          return;
        }

        chosenCandidates.push(freeAgentCandidate);
        chosenKeys.add(freeAgentCandidate.canonicalKey);
        degreeSnapshot.set(
          freeAgentCandidate.sourceNode.id,
          (degreeSnapshot.get(freeAgentCandidate.sourceNode.id) || 0) + 1
        );
        degreeSnapshot.set(
          freeAgentCandidate.targetNode.id,
          (degreeSnapshot.get(freeAgentCandidate.targetNode.id) || 0) + 1
        );
        usedSlots += 1;
      });
    }

    candidates.forEach((candidate) => {
      if (chosenKeys.has(candidate.canonicalKey)) {
        return;
      }

      if (!canAllocate(candidate, degreeSnapshot, usedSlots)) {
        return;
      }

      chosenCandidates.push(candidate);
      chosenKeys.add(candidate.canonicalKey);
      degreeSnapshot.set(candidate.sourceNode.id, (degreeSnapshot.get(candidate.sourceNode.id) || 0) + 1);
      degreeSnapshot.set(candidate.targetNode.id, (degreeSnapshot.get(candidate.targetNode.id) || 0) + 1);
      usedSlots += 1;
    });

    chosenCandidates.forEach((candidate) => {
      if (state.dynamicEdges.has(candidate.canonicalKey)) {
        return;
      }

      createDynamicEdge(candidate.sourceNode, candidate.targetNode, logicalSeconds);
    });
  };

  const tick = (timestamp) => {
    if (!state.started) {
      state.started = true;
      state.clockStart = timestamp;
      state.lastTimestamp = timestamp;
    }

    const deltaTime = Math.max(0, (timestamp - state.lastTimestamp) / 1000);
    state.lastTimestamp = timestamp;
    state.logicalSeconds = Math.max(0, (timestamp - state.clockStart) / 1000);

    updateNodePositions(state.logicalSeconds);
    updatePermanentEdgePositions();
    updateDynamicEdges(deltaTime, state.logicalSeconds);

    state.animationFrameId = window.requestAnimationFrame(tick);
  };

  const stopAnimation = () => {
    if (state.animationFrameId) {
      window.cancelAnimationFrame(state.animationFrameId);
      state.animationFrameId = null;
    }
  };

  const stopNetwork = () => {
    stopAnimation();
    state.started = false;
    state.clockStart = 0;
    state.lastTimestamp = 0;
    state.logicalSeconds = 0;
    state.dynamicAccumulator = 0;
    clearDynamicEdgesImmediate();
    resetNodePositionsToAnchors();
    updatePermanentEdgePositions();
  };

  const startNetwork = () => {
    if (state.animationFrameId || state.motionMode === "reduced" || state.motionMode === "static") {
      return;
    }

    state.started = false;
    state.clockStart = 0;
    state.lastTimestamp = 0;
    state.logicalSeconds = 0;
    state.dynamicAccumulator = 0;
    clearDynamicEdgesImmediate();
    state.animationFrameId = window.requestAnimationFrame(tick);
  };

  const refreshViewportMode = () => {
    const previousMode = state.motionMode;
    state.motionMode = getMotionMode();
    updateNodeMotionScales();

    if (state.motionMode === "reduced" || state.motionMode === "static") {
      stopNetwork();
      return;
    }

    if (previousMode !== state.motionMode) {
      clearDynamicEdgesImmediate();
      state.dynamicAccumulator = 0;
    }

    if (!state.animationFrameId && !document.hidden) {
      startNetwork();
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      state.pausedAt = window.performance.now();
      stopAnimation();
      return;
    }

    if (state.motionMode === "reduced" || state.motionMode === "static") {
      return;
    }

    if (state.pausedAt && state.clockStart) {
      const pauseDuration = window.performance.now() - state.pausedAt;
      state.clockStart += pauseDuration;
      state.lastTimestamp = window.performance.now();
      state.pausedAt = 0;
    }

    if (!state.animationFrameId) {
      state.animationFrameId = window.requestAnimationFrame(tick);
    }
  };

  const handleReducedMotionChange = (event) => {
    state.reducedMotionActive = event.matches;
    refreshViewportMode();
  };

  const handleResize = () => {
    if (state.resizeTimerId) {
      window.clearTimeout(state.resizeTimerId);
    }

    state.resizeTimerId = window.setTimeout(() => {
      refreshViewportMode();
    }, 120);
  };

  initialiseNodes();
  initialisePermanentEdges();
  resetNodePositionsToAnchors();
  updatePermanentEdgePositions();
  state.motionMode = getMotionMode();

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", handleResize);

  if (state.motionMode !== "reduced" && state.motionMode !== "static") {
    startNetwork();
  }
})();
