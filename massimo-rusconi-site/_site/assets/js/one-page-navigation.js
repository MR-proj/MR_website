(() => {
  if (document.body?.dataset.onePageNavigationInitialised === "true") {
    return;
  }

  document.body.dataset.onePageNavigationInitialised = "true";

  const isOnePageSite = document.body?.classList.contains("one-page-site");
  const reducedMotionQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : { matches: false };

  if (!isOnePageSite) {
    return;
  }

  const mainSectionIds = ["home", "academic", "industry", "skills", "cv", "contact"];
  const mainSections = mainSectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!mainSections.length) {
    return;
  }

  const getNavbar = () => document.querySelector("#quarto-header .navbar");
  const getNavbarHeight = () => getNavbar()?.getBoundingClientRect().height ?? 0;
  const getHashTarget = (hash) => {
    if (!hash || !hash.startsWith("#")) {
      return null;
    }

    const decodedHash = decodeURIComponent(hash);
    return document.getElementById(decodedHash.slice(1));
  };

  const getUrlForLink = (link) => {
    const href = link.getAttribute("href");

    if (!href || href.startsWith("mailto:")) {
      return null;
    }

    try {
      return new URL(href, window.location.href);
    } catch {
      return null;
    }
  };

  const sameDocumentPath = (url) => {
    const currentPath = window.location.pathname.replace(/\/+$/, "");
    const targetPath = url.pathname.replace(/\/+$/, "");

    return (
      !targetPath ||
      targetPath === currentPath ||
      targetPath.endsWith("/index.html") && currentPath.endsWith("/index.html") ||
      targetPath === `${currentPath}/index.html`
    );
  };

  const shouldInterceptLink = (link) => {
    const href = link.getAttribute("href");

    if (!href || href.startsWith("mailto:")) {
      return false;
    }

    if (href.startsWith("#")) {
      return Boolean(getHashTarget(href));
    }

    const url = getUrlForLink(link);

    if (!url || !url.hash) {
      return false;
    }

    if (url.origin !== window.location.origin || !sameDocumentPath(url)) {
      return false;
    }

    return Boolean(getHashTarget(url.hash));
  };

  const scrollToTarget = (target, updateHistory) => {
    if (!target) {
      return;
    }

    target.scrollIntoView({
      block: "start",
      behavior: reducedMotionQuery.matches ? "auto" : "smooth"
    });

    if (updateHistory) {
      const nextHash = `#${target.id}`;

      if (window.location.hash !== nextHash) {
        window.history.pushState(null, "", nextHash);
      }
    }
  };

  const navbarLinks = Array.from(
    document.querySelectorAll("#quarto-header .navbar .nav-link[href]")
  );
  const mainLinkMap = new Map();

  navbarLinks.forEach((link) => {
    const url = getUrlForLink(link);
    const hash = link.getAttribute("href")?.startsWith("#")
      ? link.getAttribute("href")
      : url?.hash;

    if (hash && mainSectionIds.includes(hash.slice(1))) {
      mainLinkMap.set(hash.slice(1), link);
    }
  });

  const updateActiveNav = () => {
    const threshold = getNavbarHeight() + 32;
    const scrollBottom = window.scrollY + window.innerHeight;
    const documentBottom = document.documentElement.scrollHeight - 16;
    let activeId = mainSections[0]?.id ?? "home";

    mainSections.forEach((section) => {
      const top = section.getBoundingClientRect().top + window.scrollY;

      if (top <= window.scrollY + threshold) {
        activeId = section.id;
      }
    });

    if (scrollBottom >= documentBottom) {
      activeId = "contact";
    }

    mainLinkMap.forEach((link, id) => {
      const isActive = id === activeId;
      link.classList.toggle("active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  let scrollTicking = false;

  const requestNavUpdate = () => {
    if (scrollTicking) {
      return;
    }

    scrollTicking = true;
    window.requestAnimationFrame(() => {
      scrollTicking = false;
      updateActiveNav();
    });
  };

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;

    if (!link || !shouldInterceptLink(link)) {
      return;
    }

    const href = link.getAttribute("href");
    const url = href?.startsWith("#") ? null : getUrlForLink(link);
    const hash = href?.startsWith("#") ? href : url?.hash;
    const target = hash ? getHashTarget(hash) : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    scrollToTarget(target, true);
    requestNavUpdate();
  });

  const syncToCurrentHash = () => {
    const target = getHashTarget(window.location.hash);

    if (!target) {
      requestNavUpdate();
      return;
    }

    scrollToTarget(target, false);
    requestNavUpdate();
  };

  window.addEventListener("scroll", requestNavUpdate, { passive: true });
  window.addEventListener("popstate", syncToCurrentHash);
  window.addEventListener("hashchange", syncToCurrentHash);

  window.requestAnimationFrame(() => {
    syncToCurrentHash();
  });
})();
