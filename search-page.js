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
const searchPanel = document.querySelector(".search-panel");
const topbar = document.querySelector(".topbar");

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
let favorites = loadFavorites();
let currentItems = [];
let searchTimeout;
let requestCounter = 0;
let activeMode = "search";

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

function sortFavoritesByRating() {
  favorites.sort((left, right) => {
    const ratingDiff = Number(right.userRating || 0) - Number(left.userRating || 0);
    if (ratingDiff !== 0) {
      return ratingDiff;
    }

    return (left.title || "").localeCompare(right.title || "", "de");
  });
}

function getFavoriteKey(item) {
  return `${item.media_type}-${item.id}`;
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
    sortFilter.value !== "top_rated"
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

function updateSearchPanelMetrics() {
  const topbarHeight = Math.ceil(topbar?.getBoundingClientRect().height || 0);
  document.documentElement.style.setProperty("--topbar-offset", `${topbarHeight}px`);
}

function scrollResultsIntoView() {
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

function buildImageUrl(path) {
  return path ? `${IMG}${path}` : FALLBACK_POSTER;
}

function buildBackdropUrl(path) {
  return path ? `https://image.tmdb.org/t/p/original${path}` : "";
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

async function fetchData(path) {
  if (!hasApiKey()) {
    throw new Error("TMDB API-Key fehlt. Trage ihn in search-page.js ein.");
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

function syncUrlState() {
  const url = new URL(window.location.href);
  const query = searchInput.value.trim();

  if (query) {
    url.searchParams.set("q", query);
  } else {
    url.searchParams.delete("q");
  }

  if (mediaFilter.value !== "all") {
    url.searchParams.set("media", mediaFilter.value);
  } else {
    url.searchParams.delete("media");
  }

  if (genreFilter.value) {
    url.searchParams.set("genre", genreFilter.value);
  } else {
    url.searchParams.delete("genre");
  }

  if (yearFilter.value) {
    url.searchParams.set("year", yearFilter.value);
  } else {
    url.searchParams.delete("year");
  }

  if (Number(ratingFilter.value) > 0) {
    url.searchParams.set("rating", ratingFilter.value);
  } else {
    url.searchParams.delete("rating");
  }

  if (sortFilter.value !== "top_rated") {
    url.searchParams.set("sort", sortFilter.value);
  } else {
    url.searchParams.delete("sort");
  }

  if (seriesStatusFilter.value) {
    url.searchParams.set("status", seriesStatusFilter.value);
  } else {
    url.searchParams.delete("status");
  }

  window.history.replaceState({}, "", url);
}

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const media = params.get("media");
  const genre = params.get("genre");
  const year = params.get("year");
  const rating = params.get("rating");
  const sort = params.get("sort");
  const status = params.get("status");

  searchInput.value = params.get("q") || "";

  if (media && ["all", "movie", "tv"].includes(media)) {
    mediaFilter.value = media;
  }

  if (sort && [...sortFilter.options].some((option) => option.value === sort)) {
    sortFilter.value = sort;
  }

  if (rating && [...ratingFilter.options].some((option) => option.value === rating)) {
    ratingFilter.value = rating;
  }

  if (year && [...yearFilter.options].some((option) => option.value === year)) {
    yearFilter.value = year;
  }

  if (status && [...seriesStatusFilter.options].some((option) => option.value === status)) {
    seriesStatusFilter.value = status;
  }

  populateGenreFilter();

  if (genre && [...genreFilter.options].some((option) => option.value === genre)) {
    genreFilter.value = genre;
  }
}

async function loadSearchResults() {
  const query = searchInput.value.trim();
  syncUrlState();

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
      scrollResultsIntoView();
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

function buildDiscoverPath(mode, mediaType = mediaFilter.value === "all" ? "movie" : mediaFilter.value) {
  const params = new URLSearchParams();

  if (genreFilter.value) {
    params.set("with_genres", genreFilter.value);
  }

  if (yearFilter.value) {
    if (mediaType === "movie") {
      params.set("primary_release_year", yearFilter.value);
    } else {
      params.set("first_air_date_year", yearFilter.value);
    }
  }

  if (Number(ratingFilter.value) > 0) {
    params.set("vote_average.gte", ratingFilter.value);
  }

  if (mediaType === "tv" && seriesStatusFilter.value) {
    params.set("with_status", seriesStatusFilter.value);
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
  const data = await fetchData(buildDiscoverPath(mode, mediaType));
  return (data.results || []).map((item) => ({ ...item, media_type: mediaType }));
}

async function loadBrowseResults(mode = sortFilter.value) {
  const requestId = ++requestCounter;
  activeMode = "browse";
  syncUrlState();
  setStatus("Liste wird geladen...");

  try {
    if (mediaFilter.value === "all") {
      const [movieItems, tvItems] = await Promise.all([
        fetchBrowseItemsForType("movie", mode),
        fetchBrowseItemsForType("tv", mode),
      ]);
      currentItems = [...movieItems, ...tvItems];
    } else {
      currentItems = await fetchBrowseItemsForType(mediaFilter.value, mode);
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
      scrollResultsIntoView();
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
  syncUrlState();

  if (searchInput.value.trim().length >= 3) {
    await loadSearchResults();
    return;
  }

  if (activeMode === "browse" || hasActiveFilters()) {
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

filterToggleBtn.addEventListener("click", () => {
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

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

populateYearFilter();
updateSearchPanelMetrics();

window.addEventListener("resize", () => {
  updateSearchPanelMetrics();
});

if (hasApiKey()) {
  loadGenres()
    .then(() => {
      applyUrlState();
      setFiltersExpanded(hasActiveFilters());

      if (searchInput.value.trim() || hasActiveFilters()) {
        refreshResults();
      } else {
        setStatus("Suche startet ab 3 Buchstaben. Fuer Listen bitte mindestens einen Filter waehlen.");
      }
    })
    .catch((error) => {
      setStatus(error.message);
    });
} else {
  setStatus("TMDB API-Key fehlt. Trage ihn in search-page.js ein.");
}

initLogoLoopVideo();
