(() => {
  const body = document.body;

  if (!body || body.dataset.scientificBackgroundInitialised === "true") {
    return;
  }

  body.dataset.scientificBackgroundInitialised = "true";

  if (!body.classList.contains("one-page-site")) {
    return;
  }

  const root = document.getElementById("scientific-background-root");
  const edgeLayer = document.getElementById("scientific-background-edges");
  const nodeLayer = document.getElementById("scientific-background-nodes");

  if (!root || !edgeLayer || !nodeLayer) {
    return;
  }

  const SECTION_IDS = ["home", "academic", "industry", "skills", "cv", "contact"];
  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean);

  if (sections.length !== SECTION_IDS.length) {
    return;
  }

  const reducedMotionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false, addEventListener() {}, addListener() {} };

  // A perturbed triangular field, weighted toward cropped edge
  // clusters and an open centre. Only connectivity changes with scroll.
  const nodes = [
    { id: "p00", x: -140, y: -70 },
    { id: "p01", x: 10, y: -40 },
    { id: "p02", x: 430, y: -105 },
    { id: "p03", x: 575, y: -25, marker: "accent" },
    { id: "p04", x: 930, y: -85 },
    { id: "p05", x: 1080, y: -35 },
    { id: "p06", x: 1250, y: -70 },
    { id: "p10", x: -35, y: 95 },
    { id: "p11", x: 120, y: 70 },
    { id: "p12", x: 485, y: 110 },
    { id: "p13", x: 650, y: 85 },
    { id: "p14", x: 1010, y: 95 },
    { id: "p15", x: 1160, y: 70 },
    { id: "p16", x: 1290, y: 135 },
    { id: "p20", x: -120, y: 250 },
    { id: "p21", x: 45, y: 230, marker: "primary" },
    { id: "p22", x: 185, y: 315 },
    { id: "p23", x: 520, y: 255 },
    { id: "p24", x: 930, y: 260 },
    { id: "p25", x: 1090, y: 225 },
    { id: "p26", x: 1260, y: 300 },
    { id: "p30", x: -25, y: 405 },
    { id: "p31", x: 130, y: 380 },
    { id: "p32", x: 285, y: 485 },
    { id: "p33", x: 700, y: 415 },
    { id: "p34", x: 1005, y: 420, marker: "accent" },
    { id: "p35", x: 1165, y: 380 },
    { id: "p36", x: 1290, y: 480 },
    { id: "p40", x: -125, y: 575 },
    { id: "p41", x: 35, y: 540 },
    { id: "p42", x: 210, y: 640 },
    { id: "p43", x: 480, y: 575, marker: "primary" },
    { id: "p44", x: 850, y: 620 },
    { id: "p45", x: 1050, y: 555 },
    { id: "p46", x: 1240, y: 650 },
    { id: "p50", x: -20, y: 790 },
    { id: "p51", x: 145, y: 720 },
    { id: "p52", x: 315, y: 845 },
    { id: "p53", x: 600, y: 735 },
    { id: "p54", x: 900, y: 830 },
    { id: "p55", x: 1090, y: 730 },
    { id: "p56", x: 1260, y: 850 },
    { id: "l0", x: -40, y: 15 },
    { id: "l1", x: 70, y: 145 },
    { id: "l2", x: -55, y: 330 },
    { id: "l3", x: 80, y: 305 },
    { id: "l4", x: -45, y: 495 },
    { id: "r0", x: 1010, y: 15 },
    { id: "r1", x: 1195, y: 160 },
    { id: "r2", x: 995, y: 180 },
    { id: "r3", x: 1195, y: 300 },
    { id: "r4", x: 1040, y: 485 },
    { id: "r5", x: 1200, y: 560 },
    { id: "r6", x: 1000, y: 700 },
    { id: "r7", x: 1190, y: 775 },
    { id: "b0", x: 245, y: 760 },
    { id: "b1", x: 420, y: 720 },
    { id: "b2", x: 500, y: 830 },
    { id: "b3", x: 700, y: 700 },
    { id: "b4", x: 735, y: 845 }
  ];

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const edgeKey = (from, to) => [from, to].sort().join("::");
  const edge = (from, to, tone = "primary") => ({ from, to, tone, key: edgeKey(from, to) });

  // Shared groups keep adjacent anchor states recognisably related.
  const sharedAll = [
    edge("p00", "p01", "secondary"), edge("p00", "p10"),
    edge("p01", "p10"), edge("p10", "p20", "secondary"),
    edge("p20", "p21"), edge("p10", "p21"),
    edge("p02", "p12"), edge("p02", "p03", "secondary"),
    edge("p03", "p12"), edge("p03", "p13"),
    edge("p12", "p13"), edge("p04", "p14"),
    edge("p04", "p05", "secondary"), edge("p05", "p15"),
    edge("p14", "p15"), edge("p21", "p31"),
    edge("p31", "p32"), edge("p22", "p32"),
    edge("p33", "p34"), edge("p34", "p44"),
    edge("p43", "p44"), edge("p44", "p54", "secondary")
  ];

  const homeAcademic = [
    edge("p20", "p30"), edge("p30", "p31"),
    edge("p21", "p30"), edge("p14", "p24"),
    edge("p24", "p25", "secondary"), edge("p15", "p25"),
    edge("p01", "p11", "secondary"), edge("p11", "p20"),
    edge("p05", "p16", "secondary"), edge("p16", "p26"),
    edge("p00", "l0"), edge("l0", "p01", "secondary"),
    edge("l0", "p10"), edge("p10", "l1"),
    edge("l1", "p11", "secondary"), edge("l1", "p21")
  ];

  const homeOnly = [
    edge("p25", "p26", "secondary"), edge("p13", "p25", "accent")
  ];

  const academicIndustry = [
    edge("p12", "p22"), edge("p22", "p23"),
    edge("p12", "p23"), edge("p23", "p24"),
    edge("p24", "p34"), edge("p23", "p34"),
    edge("p34", "p35"), edge("p25", "p35"),
    edge("p35", "p45", "secondary"), edge("p14", "p25"),
    edge("p25", "p26", "secondary"), edge("p35", "p36", "secondary"),
    edge("p35", "p46"), edge("p04", "r0"),
    edge("r0", "p05", "secondary"), edge("r0", "p14"),
    edge("p15", "r1"), edge("r1", "p16", "secondary"),
    edge("r1", "p26"), edge("p14", "r2"),
    edge("r2", "p24", "secondary"), edge("r2", "p25"),
    edge("p25", "r3"), edge("r3", "p26", "secondary"),
    edge("r3", "p35"), edge("p34", "r4"),
    edge("r4", "p35", "secondary"), edge("r4", "p45")
  ];

  const academicOnly = [
    edge("p02", "p11"), edge("p11", "p12"),
    edge("p03", "p04"), edge("p04", "p13"),
    edge("p31", "p42"), edge("p32", "p42"),
    edge("p11", "p21"), edge("p21", "p22"),
    edge("p22", "p30", "secondary"), edge("p13", "p14", "secondary"),
    edge("p20", "l2"), edge("l2", "p30", "secondary"),
    edge("p21", "l3"), edge("l3", "p22", "secondary"),
    edge("l3", "p31"), edge("p30", "l4"),
    edge("l4", "p41", "secondary")
  ];

  const industrySkills = [
    edge("p24", "p25"), edge("p25", "p35"),
    edge("p24", "p35"), edge("p34", "p35"),
    edge("p35", "p45"), edge("p44", "p45"),
    edge("p33", "p43"), edge("p30", "p40", "secondary"),
    edge("p40", "p41"), edge("p30", "p41"),
    edge("p26", "p35"), edge("p26", "p36"),
    edge("p36", "p45", "secondary"), edge("p46", "p55", "secondary"),
    edge("p36", "r5"), edge("r5", "p46", "secondary"),
    edge("r5", "p55"), edge("p44", "r6"),
    edge("r6", "p45", "secondary"), edge("r6", "p54"),
    edge("p46", "r7"), edge("r7", "p55", "secondary"),
    edge("r7", "p56")
  ];

  const industryOnly = [
    edge("p10", "p11"), edge("p11", "p21"),
    edge("p22", "p31"), edge("p31", "p41"),
    edge("p45", "p55", "secondary")
  ];

  const skillsCv = [
    edge("p32", "p43"), edge("p42", "p43"),
    edge("p42", "p52"), edge("p43", "p52"),
    edge("p45", "p46", "secondary"), edge("p43", "p53"),
    edge("p54", "p55"), edge("p55", "p56", "secondary"),
    edge("p45", "p55"), edge("p41", "p42"),
    edge("p41", "p51"), edge("p51", "p52"),
    edge("p52", "p53", "secondary"), edge("p41", "b0"),
    edge("b0", "p42", "secondary"), edge("b0", "p51"),
    edge("p42", "b1"), edge("b1", "p43", "secondary"),
    edge("b1", "p52"), edge("p43", "b2"),
    edge("b2", "p52", "secondary"), edge("b2", "p53"),
    edge("p44", "b3"), edge("b3", "p53", "secondary"),
    edge("b3", "p54"), edge("p53", "b4"),
    edge("b4", "p54", "secondary"), edge("b4", "p55")
  ];

  const skillsOnly = [
    edge("p03", "p14", "accent"), edge("p14", "p25"),
    edge("p35", "p44"), edge("p36", "p46", "secondary")
  ];

  const cvContact = [
    edge("p01", "p02", "secondary"), edge("p12", "p22"),
    edge("p33", "p43"), edge("p53", "p54", "secondary"),
    edge("p50", "p51"), edge("p51", "p52", "secondary"),
    edge("p55", "p56", "secondary"), edge("p45", "p54"),
    edge("p44", "b3"), edge("b3", "p53", "secondary"),
    edge("b3", "p54"), edge("p53", "b4"),
    edge("b4", "p54", "secondary"), edge("b4", "p55")
  ];

  const cvOnly = [
    edge("p02", "p11"), edge("p22", "p31"),
    edge("p44", "p45", "secondary")
  ];

  const contactOnly = [
    edge("p13", "p23", "secondary"), edge("p34", "p43")
  ];

  const combine = (...groups) => {
    const combined = new Map();
    groups.flat().forEach((definition) => combined.set(definition.key, definition));
    return combined;
  };

  const topologies = {
    home: combine(sharedAll, homeAcademic, homeOnly),
    academic: combine(sharedAll, homeAcademic, academicIndustry, academicOnly),
    industry: combine(sharedAll, academicIndustry, industrySkills, industryOnly),
    skills: combine(sharedAll, industrySkills, skillsCv, skillsOnly),
    cv: combine(sharedAll, skillsCv, cvContact, cvOnly),
    contact: combine(sharedAll, cvContact, contactOnly)
  };

  const prominence = {
    home: 0.66,
    academic: 0.84,
    industry: 0.8,
    skills: 0.78,
    cv: 0.7,
    contact: 0.62
  };

  const allEdges = new Map();

  Object.values(topologies).forEach((topology) => {
    topology.forEach((definition, key) => {
      if (allEdges.has(key)) {
        return;
      }

      const source = nodeMap.get(definition.from);
      const target = nodeMap.get(definition.to);

      if (source && target) {
        allEdges.set(key, {
          ...definition,
          length: Math.hypot(target.x - source.x, target.y - source.y)
        });
      }
    });
  });

  const edgeElements = new Map();
  const edgeFragment = document.createDocumentFragment();

  allEdges.forEach((definition, key) => {
    const source = nodeMap.get(definition.from);
    const target = nodeMap.get(definition.to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("class", `scientific-edge scientific-edge--${definition.tone}`);
    line.setAttribute("data-edge-key", key);
    line.setAttribute("x1", source.x);
    line.setAttribute("y1", source.y);
    line.setAttribute("x2", target.x);
    line.setAttribute("y2", target.y);
    line.style.opacity = "0";
    edgeElements.set(key, { element: line, definition });
    edgeFragment.appendChild(line);
  });

  edgeLayer.appendChild(edgeFragment);

  const nodeFragment = document.createDocumentFragment();

  nodes.forEach((node) => {
    if (!node.marker) {
      return;
    }

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const accentClass = node.marker === "accent" ? " scientific-node--accent" : "";

    circle.setAttribute("class", `scientific-node${accentClass}`);
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", node.marker === "accent" ? "0.48" : "0.4");
    nodeFragment.appendChild(circle);
  });

  nodeLayer.appendChild(nodeFragment);

  let anchors = [];
  let frameId = 0;
  let geometryDirty = true;

  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const smoothstep = (value) => value * value * (3 - 2 * value);

  const refreshAnchors = () => {
    anchors = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const inset = Math.min(rect.height * 0.5, window.innerHeight * 0.38);
      return { id: section.id, position: sectionTop + inset };
    });
    geometryDirty = false;
  };

  const resolveBlend = () => {
    const scrollReference = window.scrollY + window.innerHeight * 0.5;

    if (scrollReference <= anchors[0].position) {
      return { from: anchors[0].id, to: anchors[0].id, progress: 0 };
    }

    const lastAnchor = anchors[anchors.length - 1];

    if (scrollReference >= lastAnchor.position) {
      return { from: lastAnchor.id, to: lastAnchor.id, progress: 0 };
    }

    for (let index = 0; index < anchors.length - 1; index += 1) {
      const fromAnchor = anchors[index];
      const toAnchor = anchors[index + 1];

      if (scrollReference <= toAnchor.position) {
        const interval = Math.max(1, toAnchor.position - fromAnchor.position);
        const progress = clamp((scrollReference - fromAnchor.position) / interval, 0, 1);
        return { from: fromAnchor.id, to: toAnchor.id, progress };
      }
    }

    return { from: lastAnchor.id, to: lastAnchor.id, progress: 0 };
  };

  const updateField = () => {
    frameId = 0;

    if (geometryDirty || anchors.length !== sections.length) {
      refreshAnchors();
    }

    const blend = resolveBlend();
    const reduced = reducedMotionQuery.matches;
    const selectedId = blend.progress < 0.5 ? blend.from : blend.to;
    const fromId = reduced ? selectedId : blend.from;
    const toId = reduced ? selectedId : blend.to;
    const progress = reduced ? 0 : smoothstep(blend.progress);
    const fromTopology = topologies[fromId];
    const toTopology = topologies[toId];
    const compact = window.innerWidth <= 520;

    edgeElements.forEach(({ element, definition }, key) => {
      const fromValue = fromTopology.has(key) ? 1 : 0;
      const toValue = toTopology.has(key) ? 1 : 0;
      const structuralValue = fromValue + (toValue - fromValue) * progress;
      const compactFactor = compact && definition.length > 255 ? 0.2 : 1;
      element.style.opacity = (structuralValue * compactFactor).toFixed(3);
    });

    const fieldOpacity =
      prominence[fromId] + (prominence[toId] - prominence[fromId]) * progress;
    const nearestId = blend.progress < 0.5 ? blend.from : blend.to;

    root.style.opacity = fieldOpacity.toFixed(3);
    root.dataset.activeSection = nearestId;
    root.dataset.fromSection = fromId;
    root.dataset.toSection = toId;
    root.dataset.progress = progress.toFixed(3);
  };

  const queueUpdate = (refreshGeometry = false) => {
    geometryDirty = geometryDirty || refreshGeometry;

    if (!frameId) {
      frameId = window.requestAnimationFrame(updateField);
    }
  };

  window.addEventListener("scroll", () => queueUpdate(), { passive: true });
  window.addEventListener("resize", () => queueUpdate(true), { passive: true });
  window.addEventListener("orientationchange", () => queueUpdate(true), { passive: true });
  window.addEventListener("load", () => queueUpdate(true), { once: true });

  const handleReducedMotionChange = () => queueUpdate();

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  if (typeof ResizeObserver === "function") {
    const sectionResizeObserver = new ResizeObserver(() => queueUpdate(true));
    sections.forEach((section) => sectionResizeObserver.observe(section));
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => queueUpdate(true));
  }

  queueUpdate(true);
})();
