const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZmM1ZmQxNWUyOWYwNGFhMWViMDBhMjM1NDBlYzk5ZiIsIm5iZiI6MTc1OTYwODY5Mi41Miwic3ViIjoiNjhlMTdmNzQwYzU1YTBiYzZlZjgxMTMwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9._Z9tR5CyxKtMqZtPB3MktpfU3TflvwnaVk3fNVNPoMs";
const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%23d2d2d7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236e6e73' font-family='Segoe UI, Arial, sans-serif' font-size='34'%3EKein Poster%3C/text%3E%3C/svg%3E";

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const mediaFilter = document.getElementById("mediaFilter");
const genreFilter = document.getElementById("genreFilter");
const yearFilter = document.getElementById("yearFilter");
const ratingFilter = document.getElementById("ratingFilter");
const sortFilter = document.getElementById("sortFilter");
const seriesStatusFilter = document.getElementById("seriesStatusFilter");
const searchStatus = document.getElementById("searchStatus");
const logoLoopVideo = document.getElementById("logoLoopVideo");
const filterToggleBtn = document.getElementById("filterToggleBtn");
const filtersPanel = document.getElementById("filtersPanel");
const resultsGrid = document.getElementById("resultsGrid");
const resultsSection = document.getElementById("resultsSection");
const discoverSection = document.getElementById("discover");
const searchPanel = document.querySelector(".search-panel");
const topbar = document.querySelector(".topbar");
const rankingList = document.getElementById("rankingList");
const previewFeed = document.getElementById("previewFeed");
const topMoviesFeed = document.getElementById("topMoviesFeed");
const topTenPrevBtn = document.getElementById("topTenPrevBtn");
const topTenNextBtn = document.getElementById("topTenNextBtn");
const topMoviesBtn = document.getElementById("topMoviesBtn");
const topSeriesBtn = document.getElementById("topSeriesBtn");
const animeFeed = document.getElementById("animeFeed");
const horrorFeed = document.getElementById("horrorFeed");
const scienceFictionFeed = document.getElementById("scienceFictionFeed");
const warnerBrosFeed = document.getElementById("warnerBrosFeed");

const modal = document.getElementById("infoModal");
const modalHero = document.getElementById("modalHero");
const modalPoster = document.getElementById("modalPoster");
const modalEyebrow = document.getElementById("modalEyebrow");
const modalTitle = document.getElementById("modalTitle");
const modalMeta = document.getElementById("modalMeta");
const modalOverview = document.getElementById("modalOverview");
const modalTrailer = document.getElementById("modalTrailer");
const modalGallery = document.getElementById("modalGallery");
const modalClose = document.getElementById("modalClose");
const modalBackdrop = document.getElementById("modalBackdrop");

const yearNow = new Date().getFullYear();
const genresByType = { movie: [], tv: [] };
const PREVIEW_ROTATE_MS = 8000;
const PREVIEW_REFRESH_MS = 1800000;
const TOP_MOVIES_REFRESH_MS = 1800000;
const COVER_ROWS_REFRESH_MS = 1800000;
const coverRowConfigs = [
  {
    feed: animeFeed,
    path: "/discover/movie?with_genres=16&sort_by=popularity.desc&page=1",
    emptyTitle: "Anime-Filme aktuell nicht verfuegbar",
  },
  {
    feed: horrorFeed,
    path: "/discover/movie?with_genres=27&sort_by=popularity.desc&page=1",
    emptyTitle: "Horror-Filme aktuell nicht verfuegbar",
  },
  {
    feed: scienceFictionFeed,
    path: "/discover/movie?with_genres=878&sort_by=popularity.desc&page=1",
    emptyTitle: "Science-Fiction-Filme aktuell nicht verfuegbar",
  },
  {
    feed: warnerBrosFeed,
    path: "/discover/movie?with_companies=174&sort_by=popularity.desc&page=1",
    emptyTitle: "Warner-Bros.-Filme aktuell nicht verfuegbar",
  },
];
let favorites = loadFavorites();
let currentItems = [];
let searchTimeout;
let requestCounter = 0;
let activeMode = "search";
let previewItems = [];
let previewIndex = 0;
let previewRotateTimer;
let previewRefreshTimer;
let topMoviesRefreshTimer;
let coverRowsRefreshTimer;
let isTopMoviesDragging = false;
let topMoviesDragMoved = false;
let topMoviesDragStartX = 0;
let topMoviesDragStartScrollLeft = 0;
let suppressTopMoviesClick = false;
let activeCoverDrag = null;
let suppressCoverRowClick = false;
let coverRowInertiaFrame = 0;

function loadFavorites() {
  try {
    const parsed = JSON.parse(localStorage.getItem("steflix:favorites") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites() {
  localStorage.setItem("steflix:favorites", JSON.stringify(favorites));
}

function hasApiKey() {
  return API_KEY && API_KEY !== "DEIN_API_KEY_HIER";
}

function setStatus(message) {
  if (!searchStatus) {
    return;
  }

  searchStatus.textContent = message;
}

function hasActiveFilters() {
  return (
    mediaFilter.value !== "all" ||
    Boolean(genreFilter.value) ||
    Boolean(yearFilter.value) ||
    Number(ratingFilter.value) > 0 ||
    Boolean(seriesStatusFilter.value) ||
    sortFilter.value !== "trending"
  );
}

function setFiltersExpanded(shouldExpand) {
  if (!searchPanel || !filtersPanel || !filterToggleBtn) {
    return;
  }

  if (shouldExpand) {
    filtersPanel.hidden = false;
    requestAnimationFrame(() => {
      searchPanel.classList.add("filters-open");
      filterToggleBtn.setAttribute("aria-expanded", "true");
      filterToggleBtn.setAttribute("aria-label", "Filter ausblenden");
    });
    return;
  }

  searchPanel.classList.remove("filters-open");
  filterToggleBtn.setAttribute("aria-expanded", "false");
  filterToggleBtn.setAttribute("aria-label", "Filter einblenden");
  window.setTimeout(() => {
    if (!searchPanel.classList.contains("filters-open")) {
      filtersPanel.hidden = true;
    }
  }, 280);
}

function initLogoLoopVideo() {
  if (!logoLoopVideo) {
    return;
  }

  let nextRestartTimeout;

  const showFirstFrame = () => {
    try {
      logoLoopVideo.currentTime = 0;
    } catch {
      // Ignore seek errors until metadata is ready.
    }

    logoLoopVideo.pause();
  };

  const playLogoVideo = () => {
    showFirstFrame();

    const playPromise = logoLoopVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {});
    }
  };

  const scheduleNextPlay = () => {
    window.clearTimeout(nextRestartTimeout);
    nextRestartTimeout = window.setTimeout(() => {
      playLogoVideo();
      scheduleNextPlay();
    }, 15000);
  };

  logoLoopVideo.muted = true;
  logoLoopVideo.loop = false;
  logoLoopVideo.addEventListener("ended", showFirstFrame);
  logoLoopVideo.addEventListener("loadeddata", showFirstFrame, { once: true });
  playLogoVideo();
  scheduleNextPlay();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      playLogoVideo();
      scheduleNextPlay();
    } else {
      window.clearTimeout(nextRestartTimeout);
    }
  });
}

function updateSearchPanelMetrics() {
  const topbarHeight = Math.ceil(topbar?.getBoundingClientRect().height || 0);

  document.documentElement.style.setProperty("--topbar-offset", `${topbarHeight}px`);
  document.documentElement.style.setProperty("--search-panel-height", "0px");
}

function scrollResultsIntoSearchView() {
  if (!resultsGrid.childElementCount) {
    return;
  }

  requestAnimationFrame(() => {
    updateSearchPanelMetrics();

    const topbarHeight = Math.ceil(topbar?.getBoundingClientRect().height || 0);
    const targetTop =
      window.scrollY +
      resultsSection.getBoundingClientRect().top -
      topbarHeight -
      22;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  });
}

function scrollToResults() {
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToSearchArea() {
  discoverSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function getFavoriteKey(item) {
  return `${item.media_type}-${item.id}`;
}

function isFavorite(item) {
  return favorites.some((favorite) => favorite.key === getFavoriteKey(item));
}

function getFavoriteEntry(item) {
  return favorites.find((favorite) => favorite.key === getFavoriteKey(item));
}

function buildRatingOptions(selectedRating) {
  return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    .map((rating) => `<option value="${rating}" ${Number(selectedRating) === rating ? "selected" : ""}>${rating}</option>`)
    .join("");
}

function upsertFavorite(item, rating) {
  const key = getFavoriteKey(item);
  const existingEntry = favorites.find((favorite) => favorite.key === key);

  if (existingEntry) {
    existingEntry.userRating = Number(rating);
    existingEntry.poster_path = item.poster_path || existingEntry.poster_path || "";
    existingEntry.vote_average = item.vote_average || existingEntry.vote_average || 0;
    existingEntry.status = item.status || existingEntry.status || "";
    existingEntry.title = item.title || item.name || existingEntry.title;
  } else {
    favorites.push({
      key,
      id: item.id,
      media_type: item.media_type,
      title: item.title || item.name || "Ohne Titel",
      poster_path: item.poster_path || "",
      vote_average: item.vote_average || 0,
      status: item.status || "",
      userRating: Number(rating),
    });
  }

  sortFavoritesByRating();
  saveFavorites();
  renderRanking();
}

function getActiveMediaType() {
  return mediaFilter.value === "all" ? "movie" : mediaFilter.value;
}

function buildImageUrl(path) {
  return path ? `${IMG}${path}` : FALLBACK_POSTER;
}

function buildBackdropUrl(path) {
  return path ? `https://image.tmdb.org/t/p/original${path}` : "";
}

function stripHtml(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html || "";
  return temp.textContent || temp.innerText || "";
}

function getPreviewText(item) {
  const text = stripHtml(item.overview || item.description || "");
  if (!text) {
    return "Jetzt entdecken, Details ansehen und direkt für dein Ranking vormerken.";
  }

  return text.length > 170 ? `${text.slice(0, 167)}...` : text;
}

function renderTopMoviesFeed(items) {
  if (!topMoviesFeed) {
    return;
  }

  if (!items.length) {
    topMoviesFeed.innerHTML = `
      <article class="top-movie-card loading">
        <strong>Top 10 aktuell nicht verfügbar</strong>
        <p>Die angesagtesten Filme konnten gerade nicht geladen werden.</p>
      </article>
    `;
    return;
  }

  topMoviesFeed.innerHTML = items
    .slice(0, 10)
    .map((item, index) => {
      const title = item.title || "Ohne Titel";
      const year = getYearLabel(item);
      return `
        <article class="top-movie-card" data-top-movie-index="${index}">
          <span class="top-movie-rank">${index + 1}</span>
          <img class="top-movie-poster" src="${buildImageUrl(item.poster_path)}" alt="Poster von ${title}">
          <div class="top-movie-info">
            <strong class="top-movie-title">${title}</strong>
            <div class="top-movie-meta">
              <span>${year}</span>
              <span>TMDB ${(item.vote_average || 0).toFixed(1)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  topMoviesFeed.querySelectorAll("[data-top-movie-index]").forEach((card) => {
    card.addEventListener("click", () => {
      if (suppressTopMoviesClick) {
        return;
      }

      const item = items[Number(card.dataset.topMovieIndex || 0)];
      if (item) {
        openModal(item);
      }
    });
  });

  updateTopMoviesNav();
}

async function loadTopMoviesFeed() {
  try {
    const data = await fetchData("/trending/movie/week?page=1");
    const items = (data.results || [])
      .slice(0, 10)
      .map((item) => ({ ...item, media_type: "movie" }));

    renderTopMoviesFeed(items);
  } catch {
    if (!topMoviesFeed) {
      return;
    }

    topMoviesFeed.innerHTML = `
      <article class="top-movie-card loading">
        <strong>Top 10 aktuell nicht erreichbar</strong>
        <p>Die angesagtesten Filme konnten gerade nicht geladen werden.</p>
      </article>
    `;
  }

  updateTopMoviesNav();
}

function updateTopMoviesNav() {
  if (!topMoviesFeed || !topTenPrevBtn || !topTenNextBtn) {
    return;
  }

  const maxScrollLeft = Math.max(topMoviesFeed.scrollWidth - topMoviesFeed.clientWidth, 0);
  topTenPrevBtn.hidden = topMoviesFeed.scrollLeft <= 8;
  topTenNextBtn.hidden = maxScrollLeft - topMoviesFeed.scrollLeft <= 8;
}

function stopTopMoviesDrag() {
  if (!topMoviesFeed) {
    return;
  }

  if (topMoviesDragMoved) {
    suppressTopMoviesClick = true;
    window.setTimeout(() => {
      suppressTopMoviesClick = false;
    }, 120);
  }

  isTopMoviesDragging = false;
  topMoviesDragMoved = false;
  topMoviesFeed.classList.remove("is-dragging");
}

function startTopMoviesDrag(clientX) {
  if (!topMoviesFeed) {
    return;
  }

  isTopMoviesDragging = true;
  topMoviesDragMoved = false;
  topMoviesDragStartX = clientX;
  topMoviesDragStartScrollLeft = topMoviesFeed.scrollLeft;
  topMoviesFeed.classList.add("is-dragging");
}

function moveTopMoviesDrag(clientX) {
  if (!topMoviesFeed || !isTopMoviesDragging) {
    return;
  }

  const distance = clientX - topMoviesDragStartX;
  if (Math.abs(distance) > 6) {
    topMoviesDragMoved = true;
  }

  topMoviesFeed.scrollLeft = topMoviesDragStartScrollLeft - distance;
  updateTopMoviesNav();
}

function renderCoverRow(feed, items, emptyTitle) {
  if (!feed) {
    return;
  }

  if (!items.length) {
    feed.innerHTML = `
      <article class="cover-card cover-card-empty">
        <span>${emptyTitle}</span>
      </article>
    `;
    updateCoverRowNav(feed);
    return;
  }

  feed.innerHTML = items
    .slice(0, 24)
    .map(
      (item, index) => `
        <button class="cover-card" type="button" data-cover-index="${index}" aria-label="${item.title || item.name || "Film"} anzeigen">
          <img class="cover-card-poster" src="${buildImageUrl(item.poster_path)}" alt="Poster von ${item.title || item.name || "Film"}">
        </button>
      `
    )
    .join("");

  feed.querySelectorAll("[data-cover-index]").forEach((card) => {
    card.addEventListener("click", () => {
      if (suppressCoverRowClick) {
        return;
      }

      const item = items[Number(card.dataset.coverIndex || 0)];
      if (item) {
        openModal(item);
      }
    });
  });

  updateCoverRowNav(feed);
}

function updateCoverRowNav(feed) {
  if (!feed) {
    return;
  }

  const prevBtn = document.querySelector(`[data-cover-prev="${feed.id}"]`);
  const nextBtn = document.querySelector(`[data-cover-next="${feed.id}"]`);
  if (!prevBtn || !nextBtn) {
    return;
  }

  const maxScrollLeft = Math.max(feed.scrollWidth - feed.clientWidth, 0);
  prevBtn.hidden = feed.scrollLeft <= 8;
  nextBtn.hidden = maxScrollLeft - feed.scrollLeft <= 8;
}

function updateAllCoverRowNav() {
  coverRowConfigs.forEach(({ feed }) => updateCoverRowNav(feed));
}

async function loadCoverRows() {
  await Promise.all(
    coverRowConfigs.map(async ({ feed, path, emptyTitle }) => {
      if (!feed) {
        return;
      }

      try {
        const data = await fetchData(path);
        const items = (data.results || [])
          .filter((item) => item.poster_path)
          .slice(0, 24)
          .map((item) => ({ ...item, media_type: "movie" }));

        renderCoverRow(feed, items, emptyTitle);
      } catch {
        renderCoverRow(feed, [], emptyTitle);
      }
    })
  );
}

function startCoverRowDrag(feed, clientX) {
  if (!feed) {
    return;
  }

  window.cancelAnimationFrame(coverRowInertiaFrame);
  activeCoverDrag = {
    feed,
    startX: clientX,
    startScrollLeft: feed.scrollLeft,
    moved: false,
    lastClientX: clientX,
    velocity: 0,
  };
  feed.classList.add("is-dragging");
}

function moveCoverRowDrag(clientX) {
  if (!activeCoverDrag) {
    return;
  }

  const distance = clientX - activeCoverDrag.startX;
  if (Math.abs(distance) > 6) {
    activeCoverDrag.moved = true;
  }

  activeCoverDrag.velocity = clientX - activeCoverDrag.lastClientX;
  activeCoverDrag.lastClientX = clientX;
  activeCoverDrag.feed.scrollLeft = activeCoverDrag.startScrollLeft - distance;
  updateCoverRowNav(activeCoverDrag.feed);
}

function stopCoverRowDrag() {
  if (!activeCoverDrag) {
    return;
  }

  if (activeCoverDrag.moved) {
    suppressCoverRowClick = true;
    window.setTimeout(() => {
      suppressCoverRowClick = false;
    }, 120);
  }

  activeCoverDrag.feed.classList.remove("is-dragging");
  const feed = activeCoverDrag.feed;
  let inertiaVelocity = activeCoverDrag.velocity;
  activeCoverDrag = null;

  if (Math.abs(inertiaVelocity) > 0.8) {
    const continueMomentum = () => {
      inertiaVelocity *= 0.965;
      if (Math.abs(inertiaVelocity) < 0.18) {
        updateCoverRowNav(feed);
        return;
      }

      feed.scrollLeft -= inertiaVelocity * 22;
      updateCoverRowNav(feed);
      coverRowInertiaFrame = window.requestAnimationFrame(continueMomentum);
    };

    coverRowInertiaFrame = window.requestAnimationFrame(continueMomentum);
  }
}

function stopPreviewRotation() {
  window.clearInterval(previewRotateTimer);
  previewRotateTimer = undefined;
}

function startPreviewRotation() {
  stopPreviewRotation();

  if (previewItems.length < 2) {
    return;
  }

  previewRotateTimer = window.setInterval(() => {
    previewIndex = (previewIndex + 1) % previewItems.length;
    renderPreviewFeed(previewItems);
  }, PREVIEW_ROTATE_MS);
}

function renderPreviewFeed(items) {
  if (!items.length) {
    previewFeed.innerHTML = `
      <article class="preview-slide loading">
        <div class="preview-card-copy">
          <span class="preview-badge">Info</span>
          <strong>Keine Vorschau verfügbar</strong>
          <p>Aktuell konnten keine neuen Filme geladen werden.</p>
        </div>
      </article>
    `;
    return;
  }

  const activeItem = items[previewIndex] || items[0];
  const title = activeItem.title || activeItem.name || "Ohne Titel";
  const year = getYearLabel(activeItem);
  const release = activeItem.release_date
    ? new Date(activeItem.release_date).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" })
    : "Termin folgt";

  previewFeed.innerHTML = `
    <article class="preview-slide" data-preview-id="${activeItem.id}">
      <img class="preview-card-image" src="${buildBackdropUrl(activeItem.backdrop_path) || buildImageUrl(activeItem.poster_path)}" alt="Vorschau von ${title}">
      <div class="preview-card-overlay"></div>
      <div class="preview-card-copy preview-slide-copy">
        <span class="preview-badge">Neuer Film</span>
        <strong>${title}</strong>
        <div class="preview-meta">
          <span>${year}</span>
          <span>Release ${release}</span>
          <span>TMDB ${(activeItem.vote_average || 0).toFixed(1)}</span>
        </div>
        <p>${getPreviewText(activeItem)}</p>
      </div>
      <div class="preview-progress" aria-hidden="true">
        <span class="preview-progress-bar" style="animation-duration: ${PREVIEW_ROTATE_MS}ms;"></span>
      </div>
      <div class="preview-dots" aria-label="Vorschau Filme">
        ${items
          .map(
            (item, index) => `
              <button
                class="preview-dot ${index === previewIndex ? "is-active" : ""}"
                type="button"
                data-preview-index="${index}"
                aria-label="Film ${index + 1} anzeigen"
              ></button>`,
          )
          .join("")}
      </div>
    </article>
  `;

  const slide = previewFeed.querySelector(".preview-slide");
  slide?.addEventListener("click", () => openModal(activeItem));

  previewFeed.querySelectorAll("[data-preview-index]").forEach((dot) => {
    dot.addEventListener("click", (event) => {
      event.stopPropagation();
      previewIndex = Number(event.currentTarget.dataset.previewIndex || 0);
      renderPreviewFeed(previewItems);
      startPreviewRotation();
    });
  });
}

async function loadPreviewFeed() {
  try {
    const [nowPlaying, upcoming] = await Promise.all([
      fetchData("/movie/now_playing?page=1"),
      fetchData("/movie/upcoming?page=1"),
    ]);

    const mergedItems = [...(nowPlaying.results || []), ...(upcoming.results || [])]
      .filter((item) => item.poster_path || item.backdrop_path)
      .map((item) => ({ ...item, media_type: "movie" }))
      .filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index)
      .sort((left, right) => {
        const leftDate = left.release_date || "";
        const rightDate = right.release_date || "";
        return rightDate.localeCompare(leftDate) || (right.popularity || 0) - (left.popularity || 0);
      })
      .slice(0, 6);

    previewItems = mergedItems;
    previewIndex = 0;
    renderPreviewFeed(previewItems);
    startPreviewRotation();
  } catch {
    previewFeed.innerHTML = `
      <article class="preview-slide loading">
        <div class="preview-card-copy">
          <span class="preview-badge">Info</span>
          <strong>Vorschau aktuell nicht erreichbar</strong>
          <p>Die aktuellen Filme konnten gerade nicht geladen werden.</p>
        </div>
      </article>
    `;
    stopPreviewRotation();
  }
}

function getYearLabel(item) {
  const release = item.release_date || item.first_air_date || "";
  return release ? release.slice(0, 4) : "Unbekannt";
}

function getSeriesStatusLabel(item) {
  if (item.media_type !== "tv") {
    return "";
  }

  if (item.status === "Ended") {
    return "Abgeschlossen";
  }

  if (item.status === "Returning Series" || item.status === "In Production" || item.status === "Planned") {
    return "Laufend";
  }

  return "";
}

function sortFavoritesByRating() {
  favorites.sort((left, right) => {
    const ratingDiff = Number(right.userRating || 0) - Number(left.userRating || 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return (left.title || "").localeCompare(right.title || "", "de");
  });
}

function setFavoriteRating(index, rating) {
  favorites[index].userRating = Number(rating);
  sortFavoritesByRating();
  saveFavorites();
  renderRanking();
}

function removeFavorite(index) {
  favorites.splice(index, 1);
  saveFavorites();
  renderRanking();
  renderResults(sortItems(filterLocalItems(currentItems)));
}

async function fetchData(path) {
  if (!hasApiKey()) {
    throw new Error("TMDB API-Key fehlt. Trage ihn in script.js ein.");
  }

  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${API_BASE}${path}${separator}language=de-DE`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TMDB-Fehler: ${response.status}`);
  }

  return response.json();
}

function populateYearFilter() {
  for (let year = yearNow; year >= 1980; year -= 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    yearFilter.appendChild(option);
  }
}

function populateGenreFilter() {
  const selectedType = mediaFilter.value;
  const genres = selectedType === "all"
    ? [...genresByType.movie, ...genresByType.tv].filter(
        (genre, index, array) => array.findIndex((entry) => entry.id === genre.id) === index,
      )
    : genresByType[selectedType];

  const currentValue = genreFilter.value;
  genreFilter.innerHTML = '<option value="">Alle Genres</option>';

  genres
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, "de"))
    .forEach((genre) => {
      const option = document.createElement("option");
      option.value = String(genre.id);
      option.textContent = genre.name;
      genreFilter.appendChild(option);
    });

  if ([...genreFilter.options].some((option) => option.value === currentValue)) {
    genreFilter.value = currentValue;
  }
}

async function loadGenres() {
  const [movieGenres, tvGenres] = await Promise.all([
    fetchData("/genre/movie/list"),
    fetchData("/genre/tv/list"),
  ]);

  genresByType.movie = movieGenres.genres || [];
  genresByType.tv = tvGenres.genres || [];
  populateGenreFilter();
}

function filterLocalItems(items) {
  const selectedType = mediaFilter.value;
  const selectedGenre = genreFilter.value;
  const selectedYear = yearFilter.value;
  const minimumRating = Number(ratingFilter.value || 0);
  const selectedStatus = seriesStatusFilter.value;

  return items.filter((item) => {
    const typeMatches = selectedType === "all" || item.media_type === selectedType;
    const genreMatches = !selectedGenre || (item.genre_ids || []).includes(Number(selectedGenre));
    const yearMatches = !selectedYear || getYearLabel(item) === selectedYear;
    const ratingMatches = Number(item.vote_average || 0) >= minimumRating;
    const statusMatches =
      !selectedStatus ||
      item.media_type === "tv" &&
      (selectedStatus === "0" && getSeriesStatusLabel(item) === "Laufend") ||
      (selectedStatus === "3" && getSeriesStatusLabel(item) === "Abgeschlossen");

    return typeMatches && genreMatches && yearMatches && ratingMatches && statusMatches;
  });
}

function sortItems(items) {
  const sortedItems = [...items];

  switch (sortFilter.value) {
    case "popular":
    case "trending":
      sortedItems.sort((left, right) => (right.popularity || 0) - (left.popularity || 0));
      break;
    case "top_rated":
      sortedItems.sort((left, right) => (right.vote_average || 0) - (left.vote_average || 0));
      break;
    case "release_desc":
      sortedItems.sort((left, right) => {
        const leftDate = left.release_date || left.first_air_date || "";
        const rightDate = right.release_date || right.first_air_date || "";
        return rightDate.localeCompare(leftDate);
      });
      break;
    case "title_asc":
      sortedItems.sort((left, right) =>
        (left.title || left.name || "").localeCompare(right.title || right.name || "", "de"),
      );
      break;
    default:
      break;
  }

  return sortedItems;
}

function renderResults(items) {
  resultsGrid.innerHTML = "";

  if (!items.length) {
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";

    const title = item.title || item.name || "Ohne Titel";
    const typeLabel = item.media_type === "tv" ? "Serie" : "Film";
    const year = getYearLabel(item);
    const seriesStatus = getSeriesStatusLabel(item);
    const metaParts = [`${typeLabel} - ${year}`];

    if (seriesStatus) {
      metaParts.push(seriesStatus);
    }

    card.innerHTML = `
      <img class="poster" src="${buildImageUrl(item.poster_path)}" alt="Poster von ${title}">
      <div class="card-content">
        <h3>${title}</h3>
        <p class="meta">${metaParts.join(" - ")}</p>
        <p class="score">Bewertung: ${(item.vote_average || 0).toFixed(1)}/10</p>
        <label class="card-rating">
          <span>Dein Ranking</span>
          <select class="card-rank-select">
            <option value="">Bewerten</option>
            ${buildRatingOptions(getFavoriteEntry(item)?.userRating || "")}
          </select>
        </label>
      </div>
    `;

    card.addEventListener("click", () => openModal(item));

    const ratingControl = card.querySelector(".card-rating");
    const ratingSelect = card.querySelector(".card-rank-select");

    ratingControl.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    ratingSelect.addEventListener("change", (event) => {
      event.stopPropagation();

      if (!event.target.value) {
        return;
      }

      upsertFavorite(item, event.target.value);
    });

    resultsGrid.appendChild(card);
  });
}

function renderRanking() {
  if (!rankingList) {
    return;
  }

  rankingList.innerHTML = "";

  if (!favorites.length) {
    rankingList.innerHTML = '<div class="empty-state">Noch keine Favoriten gespeichert.</div>';
    return;
  }

  favorites.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "ranking-item";
    const status = getSeriesStatusLabel(item);
    const year = getYearLabel(item);
    row.innerHTML = `
      <div class="ranking-order">
        <span class="badge">#${index + 1}</span>
      </div>
      <div class="ranking-poster-wrap">
        <img class="ranking-poster" src="${buildImageUrl(item.poster_path)}" alt="Poster von ${item.title}">
      </div>
      <div class="ranking-main">
        <strong class="ranking-title">${item.title}</strong>
        <div class="ranking-meta-row">
          <p class="meta">${item.media_type === "tv" ? "Serie" : "Film"} - ${year}${status ? ` - ${status}` : ""}</p>
          <span class="ranking-chip">${Number(item.userRating || 0).toFixed(0)}/10</span>
        </div>
        <p class="ranking-hint">Klicken fuer Details und Trailer</p>
        <div class="ranking-actions">
          <button class="rank-btn danger" type="button" data-action="remove">Entfernen</button>
        </div>
      </div>
      <div class="ranking-side">
        <label class="rating-control">
          <span>Dein Ranking</span>
          <select class="rank-select">
            <option value="10" ${Number(item.userRating || 10) === 10 ? "selected" : ""}>10</option>
            <option value="9" ${Number(item.userRating || 10) === 9 ? "selected" : ""}>9</option>
            <option value="8" ${Number(item.userRating || 10) === 8 ? "selected" : ""}>8</option>
            <option value="7" ${Number(item.userRating || 10) === 7 ? "selected" : ""}>7</option>
            <option value="6" ${Number(item.userRating || 10) === 6 ? "selected" : ""}>6</option>
            <option value="5" ${Number(item.userRating || 10) === 5 ? "selected" : ""}>5</option>
            <option value="4" ${Number(item.userRating || 10) === 4 ? "selected" : ""}>4</option>
            <option value="3" ${Number(item.userRating || 10) === 3 ? "selected" : ""}>3</option>
            <option value="2" ${Number(item.userRating || 10) === 2 ? "selected" : ""}>2</option>
            <option value="1" ${Number(item.userRating || 10) === 1 ? "selected" : ""}>1</option>
          </select>
        </label>
        <div class="ranking-score-card">
          <span class="ranking-score-label">TMDB Score</span>
          <span class="ranking-score">${(item.vote_average || 0).toFixed(1)}</span>
        </div>
      </div>
    `;

    row.addEventListener("click", () => {
      openModal(item);
    });

    row.querySelector(".rank-select").addEventListener("change", (event) => {
      event.stopPropagation();
      setFavoriteRating(index, event.target.value);
    });

    row.querySelector(".rating-control").addEventListener("click", (event) => {
      event.stopPropagation();
    });

    row.querySelector('[data-action="remove"]').addEventListener("click", (event) => {
      event.stopPropagation();
      removeFavorite(index);
    });

    rankingList.appendChild(row);
  });
}

function applyAndRenderCurrentItems(message) {
  const filteredItems = sortItems(filterLocalItems(currentItems));
  renderResults(filteredItems);
  setStatus(message || (filteredItems.length ? `${filteredItems.length} Treffer geladen.` : "Keine Treffer gefunden."));
  return filteredItems;
}

async function enrichSeriesStatuses(items) {
  const selectedStatus = seriesStatusFilter.value;

  if (!selectedStatus) {
    return items;
  }

  const tvItems = items.filter((item) => item.media_type === "tv" && !item.status);

  await Promise.all(
    tvItems.map(async (item) => {
      try {
        const details = await fetchData(`/tv/${item.id}`);
        item.status = details.status || "";
      } catch {
        item.status = "";
      }
    }),
  );

  return items;
}

async function loadSearchResults() {
  const query = searchInput.value.trim();

  if (query.length < 3) {
    await refreshResults();
    return;
  }

  const requestId = ++requestCounter;
  activeMode = "search";
  setStatus("Suche laeuft...");

  try {
    const data = await fetchData(`/search/multi?query=${encodeURIComponent(query)}`);
    if (requestId !== requestCounter) {
      return;
    }

    currentItems = (data.results || []).filter((item) => item.media_type === "movie" || item.media_type === "tv");
    await enrichSeriesStatuses(currentItems);

    if (requestId !== requestCounter) {
      return;
    }

    const filteredItems = applyAndRenderCurrentItems(
      currentItems.length ? `${currentItems.length} Titel geladen.` : "Keine Treffer gefunden.",
    );
    if (filteredItems.length) {
      scrollResultsIntoSearchView();
    }
    setStatus(filteredItems.length ? `${filteredItems.length} Treffer fuer "${query}".` : `Keine Treffer fuer "${query}".`);
  } catch (error) {
    if (requestId !== requestCounter) {
      return;
    }

    currentItems = [];
    resultsGrid.innerHTML = "";
    setStatus(error.message);
  }
}

function buildDiscoverPath(mode, mediaType = getActiveMediaType()) {
  const params = new URLSearchParams();
  const selectedGenre = genreFilter.value;
  const selectedYear = yearFilter.value;
  const selectedRating = ratingFilter.value;
  const selectedStatus = seriesStatusFilter.value;

  if (selectedGenre) {
    params.set("with_genres", selectedGenre);
  }

  if (selectedYear) {
    if (mediaType === "movie") {
      params.set("primary_release_year", selectedYear);
    } else {
      params.set("first_air_date_year", selectedYear);
    }
  }

  if (selectedRating && Number(selectedRating) > 0) {
    params.set("vote_average.gte", selectedRating);
  }

  if (mediaType === "tv" && selectedStatus) {
    params.set("with_status", selectedStatus);
  }

  if (mode === "trending") {
    return `/trending/${mediaType}/week?${params.toString()}`;
  }

  if (mode === "popular") {
    params.set("sort_by", "popularity.desc");
  } else if (mode === "top_rated") {
    params.set("sort_by", "vote_average.desc");
    params.set("vote_count.gte", "150");
  } else if (mode === "release_desc") {
    params.set("sort_by", mediaType === "movie" ? "primary_release_date.desc" : "first_air_date.desc");
  } else if (mode === "title_asc") {
    params.set("sort_by", mediaType === "movie" ? "title.asc" : "name.asc");
  } else {
    params.set("sort_by", "popularity.desc");
  }

  return `/discover/${mediaType}?${params.toString()}`;
}

async function fetchBrowseItemsForType(mediaType, mode) {
  const path = buildDiscoverPath(mode, mediaType);
  const data = await fetchData(path);
  return (data.results || []).map((item) => ({ ...item, media_type: mediaType }));
}

async function loadBrowseResults(mode = sortFilter.value) {
  const mediaType = getActiveMediaType();

  const requestId = ++requestCounter;
  activeMode = "browse";
  setStatus("Liste wird geladen...");

  try {
    if (mediaFilter.value === "all") {
      const [movieItems, tvItems] = await Promise.all([
        fetchBrowseItemsForType("movie", mode),
        fetchBrowseItemsForType("tv", mode),
      ]);
      currentItems = [...movieItems, ...tvItems];
    } else {
      currentItems = await fetchBrowseItemsForType(mediaType, mode);
    }

    if (requestId !== requestCounter) {
      return;
    }
    await enrichSeriesStatuses(currentItems);

    if (requestId !== requestCounter) {
      return;
    }

    const filteredItems = applyAndRenderCurrentItems(
      currentItems.length ? `${currentItems.length} Titel geladen.` : "Keine Treffer gefunden.",
    );

    if (filteredItems.length) {
      scrollResultsIntoSearchView();
    }
  } catch (error) {
    if (requestId !== requestCounter) {
      return;
    }

    currentItems = [];
    resultsGrid.innerHTML = "";
    setStatus(error.message);
  }
}

async function refreshResults() {
  if (searchInput.value.trim().length >= 3) {
    await loadSearchResults();
    return;
  }

  if (activeMode === "browse" || mediaFilter.value !== "all" || genreFilter.value || yearFilter.value || Number(ratingFilter.value) > 0 || seriesStatusFilter.value) {
    await loadBrowseResults(sortFilter.value);
    return;
  }

  currentItems = [];
  resultsGrid.innerHTML = "";
  setStatus("Suche startet ab 3 Buchstaben. Fuer Listen bitte mindestens einen Filter waehlen.");
}

async function openModal(item) {
  modal.hidden = false;
  modalHero.style.backgroundImage = "";
  modalPoster.src = buildImageUrl(item.poster_path);
  modalPoster.alt = `Poster von ${item.title || item.name || "Titel"}`;
  modalEyebrow.textContent = item.media_type === "tv" ? "Serie" : "Film";
  modalTitle.textContent = item.title || item.name || "Details";
  modalMeta.innerHTML = "";
  modalOverview.textContent = "Lade Details...";
  modalTrailer.innerHTML = "";
  modalGallery.innerHTML = '<p class="modal-empty">Bilder werden geladen...</p>';

  try {
    const data = await fetchData(`/${item.media_type}/${item.id}?append_to_response=videos,images`);
    item.status = data.status || item.status || "";
    const title = data.title || data.name || item.title || item.name || "Details";
    const releaseDate = data.release_date || data.first_air_date || "";
    const year = releaseDate ? releaseDate.slice(0, 4) : "Unbekannt";
    const runtime =
      item.media_type === "movie"
        ? (data.runtime ? `${data.runtime} Min` : "")
        : (data.number_of_seasons ? `${data.number_of_seasons} Staffeln` : "");
    const genres = Array.isArray(data.genres) ? data.genres.slice(0, 3).map((genre) => genre.name) : [];
    const chips = [
      item.media_type === "tv" ? "Serie" : "Film",
      year,
      runtime,
      getSeriesStatusLabel({ ...item, status: data.status || item.status || "" }),
      data.vote_average ? `TMDB ${Number(data.vote_average).toFixed(1)}` : "",
      ...genres,
    ].filter(Boolean);

    modalTitle.textContent = title;
    modalEyebrow.textContent = item.media_type === "tv" ? "Serienprofil" : "Filmprofil";
    modalPoster.src = buildImageUrl(data.poster_path || item.poster_path);
    modalPoster.alt = `Poster von ${title}`;
    modalOverview.textContent = data.overview || "Keine Beschreibung vorhanden.";
    modalMeta.innerHTML = chips
      .map((chip) => `<span class="modal-meta-chip">${chip}</span>`)
      .join("");

    const backdrop = buildBackdropUrl(data.backdrop_path || item.backdrop_path);
    if (backdrop) {
      modalHero.style.backgroundImage = `
        linear-gradient(180deg, rgba(7, 10, 19, 0.24), rgba(7, 10, 19, 0.96)),
        linear-gradient(120deg, rgba(0, 113, 227, 0.22), transparent 45%),
        url("${backdrop}")
      `;
    }

    const videos = data.videos && Array.isArray(data.videos.results) ? data.videos.results : [];
    const trailer = videos.find((video) => video.site === "YouTube" && video.type === "Trailer");

    if (trailer) {
      modalTrailer.innerHTML = `
        <iframe
          width="100%"
          height="300"
          src="https://www.youtube.com/embed/${trailer.key}"
          title="Trailer"
          allowfullscreen
        ></iframe>
      `;
    } else {
      modalTrailer.innerHTML = '<p class="modal-empty">Kein Trailer verfuegbar.</p>';
    }

    const backdrops = data.images && Array.isArray(data.images.backdrops) ? data.images.backdrops.slice(0, 4) : [];
    if (backdrops.length) {
      modalGallery.innerHTML = backdrops
        .map((image, index) => {
          const src = buildBackdropUrl(image.file_path);
          return `<img src="${src}" alt="Szene ${index + 1} von ${title}">`;
        })
        .join("");
    } else {
      modalGallery.innerHTML = '<p class="modal-empty">Keine weiteren Bilder verfuegbar.</p>';
    }
  } catch (error) {
    modalOverview.textContent = error.message;
    modalTrailer.innerHTML = '<p class="modal-empty">Trailer konnte nicht geladen werden.</p>';
    modalGallery.innerHTML = '<p class="modal-empty">Bilder konnten nicht geladen werden.</p>';
  }
}

function closeModal() {
  modal.hidden = true;
  modalTrailer.innerHTML = "";
}

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (searchInput.value.trim().length >= 3) {
      loadSearchResults();
      return;
    }

    refreshResults();
  }, 250);
}

searchBtn.addEventListener("click", () => {
  refreshResults();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    refreshResults();
  }
});

searchInput.addEventListener("input", () => {
  debounceSearch();
});

filterToggleBtn?.addEventListener("click", () => {
  const shouldExpand = !searchPanel.classList.contains("filters-open");
  setFiltersExpanded(shouldExpand);
});

mediaFilter.addEventListener("change", () => {
  if (mediaFilter.value !== "tv") {
    seriesStatusFilter.value = "";
  }

  populateGenreFilter();
  setFiltersExpanded(true);
  refreshResults();
});

[genreFilter, yearFilter, ratingFilter, sortFilter, seriesStatusFilter].forEach((element) => {
  element.addEventListener("change", () => {
    setFiltersExpanded(true);
    refreshResults();
  });
});

topMoviesBtn.addEventListener("click", () => {
  mediaFilter.value = "movie";
  sortFilter.value = "top_rated";
  populateGenreFilter();
  scrollToResults();
  loadBrowseResults("top_rated");
});

topSeriesBtn.addEventListener("click", () => {
  mediaFilter.value = "tv";
  sortFilter.value = "top_rated";
  populateGenreFilter();
  scrollToResults();
  loadBrowseResults("top_rated");
});

topTenPrevBtn?.addEventListener("click", () => {
  topMoviesFeed?.scrollBy({ left: -280, behavior: "smooth" });
  window.setTimeout(updateTopMoviesNav, 220);
});

topTenNextBtn?.addEventListener("click", () => {
  topMoviesFeed?.scrollBy({ left: 280, behavior: "smooth" });
  window.setTimeout(updateTopMoviesNav, 220);
});

topMoviesFeed?.addEventListener("scroll", updateTopMoviesNav, { passive: true });

document.querySelectorAll("[data-cover-prev]").forEach((button) => {
  button.addEventListener("click", () => {
    const feed = document.getElementById(button.dataset.coverPrev || "");
    feed?.scrollBy({ left: -340, behavior: "smooth" });
    window.setTimeout(() => updateCoverRowNav(feed), 220);
  });
});

document.querySelectorAll("[data-cover-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const feed = document.getElementById(button.dataset.coverNext || "");
    feed?.scrollBy({ left: 340, behavior: "smooth" });
    window.setTimeout(() => updateCoverRowNav(feed), 220);
  });
});

coverRowConfigs.forEach(({ feed }) => {
  feed?.addEventListener("scroll", () => updateCoverRowNav(feed), { passive: true });

  feed?.addEventListener("mousedown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    startCoverRowDrag(feed, event.clientX);
  });

  feed?.addEventListener("mouseleave", () => {
    if (activeCoverDrag?.feed === feed) {
      stopCoverRowDrag();
    }
  });
});

topMoviesFeed?.addEventListener("mousedown", (event) => {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  startTopMoviesDrag(event.clientX);
});

window.addEventListener("mousemove", (event) => {
  moveTopMoviesDrag(event.clientX);
  moveCoverRowDrag(event.clientX);
});

window.addEventListener("mouseup", stopTopMoviesDrag);
window.addEventListener("mouseup", stopCoverRowDrag);
topMoviesFeed?.addEventListener("mouseleave", stopTopMoviesDrag);

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

populateYearFilter();
sortFavoritesByRating();
renderRanking();
resultsGrid.innerHTML = "";
updateSearchPanelMetrics();
setFiltersExpanded(hasActiveFilters());

window.addEventListener("resize", () => {
  updateSearchPanelMetrics();
  updateTopMoviesNav();
  updateAllCoverRowNav();
});

if (hasApiKey()) {
  loadGenres()
    .then(() => {
      setStatus("Suche startet ab 3 Buchstaben. Fuer Listen bitte mindestens einen Filter waehlen.");
    })
    .catch((error) => {
      setStatus(error.message);
    });
} else {
  setStatus("TMDB API-Key fehlt. Trage ihn in script.js ein.");
}

loadPreviewFeed();
window.clearInterval(previewRefreshTimer);
previewRefreshTimer = window.setInterval(() => {
  loadPreviewFeed();
}, PREVIEW_REFRESH_MS);
loadTopMoviesFeed();
window.clearInterval(topMoviesRefreshTimer);
topMoviesRefreshTimer = window.setInterval(() => {
  loadTopMoviesFeed();
}, TOP_MOVIES_REFRESH_MS);
loadCoverRows();
window.clearInterval(coverRowsRefreshTimer);
coverRowsRefreshTimer = window.setInterval(() => {
  loadCoverRows();
}, COVER_ROWS_REFRESH_MS);
initLogoLoopVideo();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasApiKey()) {
    loadPreviewFeed();
    loadTopMoviesFeed();
    loadCoverRows();
  }
});
