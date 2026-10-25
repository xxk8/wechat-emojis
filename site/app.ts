interface EmojiRecord {
  name: string;
  category: string;
  path: string;
}

interface EmojiData {
  readonly all: EmojiRecord[];
  readonly byName: Map<string, EmojiRecord>;
}

const CATEGORY_LABELS: Record<string, string> = {
  face: "人脸表情",
  gesture: "手势表情",
  animal: "动物表情",
  blessing: "祝福表情",
  other: "其他表情"
};

const COPY_RESET_MS = 1600;
const FEATURED_FADE_MS = 160;
const SCROLL_IDLE_MS = 120;
const DECODE_CHUNK = 8;

function required<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function readEmojiData(): EmojiData {
  const node = required<HTMLScriptElement>("#emoji-data");
  const all = JSON.parse(node.textContent ?? "[]") as EmojiRecord[];
  return { all, byName: new Map(all.map((emoji) => [emoji.name, emoji])) };
}

function readTileName(tile: HTMLElement): string {
  const name = tile.dataset.emoji;
  if (!name) throw new Error("Emoji tile is missing data-emoji");
  return name;
}

function readButtonLabel(button: HTMLElement): string {
  return button.textContent ?? "";
}

function hideClosestList(tile: HTMLElement, hidden: boolean): void {
  const item = tile.closest("li");
  if (item) item.hidden = hidden;
}

function isListItemHidden(tile: HTMLElement): boolean {
  return tile.closest("li")?.hidden ?? false;
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

function main(): void {
  const { all: emojis, byName } = readEmojiData();

  const tiles = [...document.querySelectorAll<HTMLElement>(".we-emoji-tile")];
  const groups = [...document.querySelectorAll<HTMLElement>(".we-custom-group")];
  const filters = [...document.querySelectorAll<HTMLElement>("[data-filter]")];
  const search = required<HTMLInputElement>("#search");
  const visibleCount = required<HTMLElement>("#visible-count");
  const empty = required<HTMLElement>("#empty");
  const emptyQuery = required<HTMLElement>("#empty-query");
  const reset = required<HTMLButtonElement>("#reset");
  const randomButton = required<HTMLButtonElement>("#random");
  const inspectorImage = required<HTMLImageElement>("#inspector-image");
  const inspectorName = required<HTMLElement>("#inspector-name");
  const inspectorCategory = required<HTMLElement>("#inspector-category");
  const inspectorPath = required<HTMLElement>("#inspector-path");
  const inspectorDownload = required<HTMLAnchorElement>("#inspector-download");
  const inspectorLive = required<HTMLElement>("#inspector-live");
  const copyLive = required<HTMLElement>("#copy-live");
  const featured = required<HTMLElement>("#featured");
  const featuredImage = required<HTMLImageElement>("#featured-image");
  const featuredName = required<HTMLElement>("#featured-name");
  const featuredNext = required<HTMLButtonElement>("#featured-next");
  const featuredLive = required<HTMLElement>("#featured-live");
  const aside = required<HTMLElement>(".we-custom-aside");
  const inspectorClose = required<HTMLButtonElement>("#inspector-close");
  const orbit = required<HTMLElement>("#orbit");
  const orbitToggle = required<HTMLButtonElement>("#orbit-toggle");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileDock = window.matchMedia("(max-width: 1119px)");
  const copyTimers = new WeakMap<HTMLElement, number>();

  let activeFilter = "all";
  let selectedName = featuredName.textContent?.trim() ?? "";

  const setFilterState = (active: string): void => {
    activeFilter = active;
    for (const filter of filters) {
      filter.setAttribute("aria-pressed", String(filter.dataset.filter === active));
    }
  };

  const focusSelectedTile = (): void => {
    const selectedTile = tiles.find((tile) => tile.dataset.emoji === selectedName);
    selectedTile?.focus();
  };

  const openDock = (): void => {
    if (!mobileDock.matches) return;
    aside.classList.add("is-open");
    inspectorClose.hidden = false;
  };

  const closeDock = (): void => {
    aside.classList.remove("is-open");
    inspectorClose.hidden = true;
  };

  const setSelected = (name: string, options: { announce?: boolean; reveal?: boolean } = {}): void => {
    const { announce = true, reveal = true } = options;
    const emoji = byName.get(name);
    if (!emoji) return;

    selectedName = emoji.name;
    inspectorImage.src = emoji.path;
    inspectorImage.alt = emoji.name;
    inspectorName.textContent = emoji.name;
    inspectorCategory.textContent = CATEGORY_LABELS[emoji.category] ?? emoji.category;
    inspectorPath.textContent = emoji.path;
    inspectorDownload.href = emoji.path;
    inspectorDownload.download = `${emoji.name}.png`;
    inspectorDownload.setAttribute("aria-label", `下载 ${emoji.name}.png`);

    for (const tile of tiles) {
      tile.setAttribute("aria-pressed", String(tile.dataset.emoji === emoji.name));
    }
    if (announce) {
      inspectorLive.textContent = `已选择 ${emoji.name}，${CATEGORY_LABELS[emoji.category] ?? ""}`;
    }
    if (reveal) openDock();
  };

  const setFeatured = (name: string, options: { announce?: boolean } = {}): void => {
    const { announce = true } = options;
    const emoji = byName.get(name);
    if (!emoji) return;

    const apply = (): void => {
      featuredImage.src = emoji.path;
      featuredImage.alt = emoji.name;
      featuredName.textContent = emoji.name;
      featured.classList.remove("is-swapping");
    };

    if (reduceMotion.matches) {
      apply();
    } else {
      featured.classList.add("is-swapping");
      window.setTimeout(apply, FEATURED_FADE_MS);
    }
    if (announce) featuredLive.textContent = `舞台中央换成了 ${emoji.name}`;
  };

  const applyFilter = (): void => {
    const query = search.value.trim();
    let shown = 0;

    for (const tile of tiles) {
      const name = readTileName(tile);
      const category = tile.dataset.category;
      const matchesCategory = activeFilter === "all" || category === activeFilter;
      const matchesQuery = query === "" || name.includes(query);
      const visible = matchesCategory && matchesQuery;
      hideClosestList(tile, !visible);
      if (visible) shown += 1;
    }

    for (const group of groups) {
      const groupTiles = [...group.querySelectorAll<HTMLElement>(".we-emoji-tile")];
      group.hidden = !groupTiles.some((tile) => !isListItemHidden(tile));
    }

    visibleCount.textContent = String(shown);
    empty.hidden = shown !== 0;
    emptyQuery.textContent = query;
  };

  const flashCopy = (button: HTMLElement, state: "copied" | "failed"): void => {
    const previous = button.dataset.defaultLabel ?? readButtonLabel(button);
    button.dataset.defaultLabel = previous;
    const existing = copyTimers.get(button);
    if (existing !== undefined) window.clearTimeout(existing);

    button.textContent = state === "copied" ? "已复制" : "复制失败";
    button.classList.toggle("is-copied", state === "copied");
    button.classList.toggle("is-failed", state === "failed");

    const timer = window.setTimeout(() => {
      button.textContent = previous;
      button.classList.remove("is-copied", "is-failed");
    }, COPY_RESET_MS);
    copyTimers.set(button, timer);
  };

  const copyText = async (text: string, button: HTMLElement): Promise<boolean> => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = legacyCopy(text);
    }
    flashCopy(button, copied ? "copied" : "failed");
    copyLive.textContent = copied ? "已复制到剪贴板" : "复制失败，请手动选择";
    return copied;
  };

  const pickNextFeatured = (): void => {
    const candidates = emojis.filter((emoji) => emoji.name !== selectedName);
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    if (!next) return;
    setFeatured(next.name);
    setSelected(next.name, { announce: false, reveal: false });
  };

  for (const tile of tiles) {
    tile.addEventListener("click", () => setSelected(readTileName(tile)));
  }

  for (const item of document.querySelectorAll<HTMLElement>(".we-orbit-item")) {
    item.addEventListener("click", () => {
      const name = readTileName(item);
      setFeatured(name);
      setSelected(name);
    });
  }

  for (const railLink of document.querySelectorAll<HTMLElement>(".we-custom-rail-link")) {
    railLink.addEventListener("click", () => {
      search.value = "";
      setFilterState("all");
      applyFilter();
    });
  }

  for (const filter of filters) {
    filter.addEventListener("click", () => {
      setFilterState(filter.dataset.filter ?? "all");
      applyFilter();
    });
  }

  search.addEventListener("input", applyFilter);

  reset.addEventListener("click", () => {
    search.value = "";
    setFilterState("all");
    applyFilter();
    search.focus();
  });

  featuredNext.addEventListener("click", pickNextFeatured);

  randomButton.addEventListener("click", () => {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    if (!emoji) return;
    search.value = "";
    setFilterState("all");
    applyFilter();
    setSelected(emoji.name);
    setFeatured(emoji.name);
    tiles.find((tile) => tile.dataset.emoji === emoji.name)?.scrollIntoView({ block: "center" });
  });

  inspectorClose.addEventListener("click", () => {
    closeDock();
    focusSelectedTile();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !aside.classList.contains("is-open")) return;
    closeDock();
    focusSelectedTile();
  });

  for (const button of document.querySelectorAll<HTMLElement>("[data-copy-field]")) {
    button.addEventListener("click", () => {
      const emoji = byName.get(selectedName);
      if (!emoji) return;
      const value = button.dataset.copyField === "name" ? emoji.name : emoji.path;
      void copyText(value, button);
    });
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-copy-target]")) {
    button.addEventListener("click", () => {
      const target = button.dataset.copyTarget
        ? document.querySelector<HTMLElement>(button.dataset.copyTarget)
        : null;
      if (target) void copyText(target.textContent ?? "", button);
    });
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) orbit.classList.toggle("is-offscreen", !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(orbit);
  }

  let userPaused = false;
  orbitToggle.addEventListener("click", () => {
    userPaused = !userPaused;
    orbit.classList.toggle("is-user-paused", userPaused);
    orbitToggle.setAttribute("aria-pressed", String(userPaused));
    orbitToggle.textContent = userPaused ? "播放动效" : "暂停动效";
  });

  const syncMotionToggle = (): void => {
    orbitToggle.hidden = reduceMotion.matches;
  };
  reduceMotion.addEventListener("change", syncMotionToggle);
  syncMotionToggle();

  let scrollIdleTimer = 0;
  window.addEventListener(
    "scroll",
    () => {
      orbit.classList.add("is-scrolling");
      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        orbit.classList.remove("is-scrolling");
      }, SCROLL_IDLE_MS);
    },
    { passive: true }
  );

  const decodeWall = (): void => {
    const images = [...document.querySelectorAll<HTMLImageElement>(".we-emoji-tile img")];
    const schedule = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
    let index = 0;

    const decodeChunk = (): void => {
      const chunk = images.slice(index, index + DECODE_CHUNK);
      index += chunk.length;
      for (const image of chunk) {
        image.loading = "eager";
        void image.decode().catch(() => {});
      }
      if (index < images.length) schedule(decodeChunk);
    };

    schedule(decodeChunk);
  };

  if (document.readyState === "complete") {
    decodeWall();
  } else {
    window.addEventListener("load", decodeWall, { once: true });
  }

  document.addEventListener("visibilitychange", () => {
    orbit.classList.toggle("is-tab-hidden", document.hidden);
  });

  mobileDock.addEventListener("change", () => {
    closeDock();
  });

  closeDock();
  setSelected(selectedName, { announce: false, reveal: false });
  applyFilter();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main, { once: true });
} else {
  main();
}
