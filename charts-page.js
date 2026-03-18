const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZmM1ZmQxNWUyOWYwNGFhMWViMDBhMjM1NDBlYzk5ZiIsIm5iZiI6MTc1OTYwODY5Mi41Miwic3ViIjoiNjhlMTdmNzQwYzU1YTBiYzZlZjgxMTMwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9._Z9tR5CyxKtMqZtPB3MktpfU3TflvwnaVk3fNVNPoMs";
const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%23d2d2d7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236e6e73' font-family='Segoe UI, Arial, sans-serif' font-size='34'%3EKein Poster%3C/text%3E%3C/svg%3E";

const logoLoopVideo = document.getElementById("logoLoopVideo");
const chartsHeroTitle = document.getElementById("chartsHeroTitle");
const chartsHeroCopy = document.getElementById("chartsHeroCopy");
const chartsHeading = document.getElementById("chartsHeading");
const chartsDescription = document.getElementById("chartsDescription");
const chartsGrid = document.getElementById("chartsGrid");
const showMoviesBtn = document.getElementById("showMoviesBtn");
const showSeriesBtn = document.getElementById("showSeriesBtn");
const chartsPrevBtn = document.getElementById("chartsPrevBtn");
const chartsNextBtn = document.getElementById("chartsNextBtn");
const chartsPageInfo = document.getElementById("chartsPageInfo");

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

const chartMetaByType = {
  movie: {
    heroTitle: "Die besten Filme bei SteFlix",
    heroCopy: "Entdecke die aktuell staerksten Filme als eigene Top-Liste mit direktem Zugriff auf Trailer und Details.",
    heading: "Top Filme",
    description: "Die Liste zeigt die bestbewerteten Filme mit genug Stimmen, damit die Auswahl nicht zufaellig wirkt.",
  },
  tv: {
    heroTitle: "Die besten Serien bei SteFlix",
    heroCopy: "Entdecke die aktuell staerksten Serien als eigene Top-Liste mit direktem Zugriff auf Trailer und Details.",
    heading: "Top Serien",
    description: "Die Liste zeigt die bestbewerteten Serien mit genug Stimmen, damit die Auswahl nicht zufaellig wirkt.",
  },
};

const MAX_CHART_PAGES = 5;
const urlParams = new URLSearchParams(window.location.search);
let currentType = urlParams.get("type") === "tv" ? "tv" : "movie";
let currentPage = Math.min(Math.max(Number(urlParams.get("page") || 1), 1), MAX_CHART_PAGES);
let totalPages = MAX_CHART_PAGES;

function hasApiKey() {
  return API_KEY && API_KEY !== "DEIN_API_KEY_HIER";
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
    throw new Error("TMDB API-Key fehlt. Trage ihn in charts-page.js ein.");
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

function updateChartCopy() {
  const meta = chartMetaByType[currentType];
  chartsHeroTitle.textContent = meta.heroTitle;
  chartsHeroCopy.textContent = meta.heroCopy;
  chartsHeading.textContent = meta.heading;
  chartsDescription.textContent = meta.description;
  showMoviesBtn.classList.toggle("is-active", currentType === "movie");
  showSeriesBtn.classList.toggle("is-active", currentType === "tv");
}

function updatePagination() {
  chartsPageInfo.textContent = `Seite ${currentPage} / ${totalPages} · bis zu ${totalPages * 20} Titel`;
  chartsPrevBtn.disabled = currentPage <= 1;
  chartsNextBtn.disabled = currentPage >= totalPages;
}

function renderCharts(items) {
  chartsGrid.innerHTML = "";

  if (!items.length) {
    chartsGrid.innerHTML = '<div class="empty-state">Aktuell konnten keine Titel geladen werden.</div>';
    return;
  }

  const rankOffset = (currentPage - 1) * 20;
  items.forEach((item, index) => {
    const card = document.createElement("article");
    const title = item.title || item.name || "Ohne Titel";
    const year = getYearLabel(item);
    card.className = "card chart-card";
    card.innerHTML = `
      <div class="chart-card-media">
        <span class="chart-rank-badge">#${rankOffset + index + 1}</span>
        <img class="poster" src="${buildImageUrl(item.poster_path)}" alt="Poster von ${title}">
      </div>
      <div class="card-content">
        <h3>${title}</h3>
        <p class="score">TMDB ${(item.vote_average || 0).toFixed(1)}</p>
        <p class="meta">${item.media_type === "tv" ? "Serie" : "Film"} - ${year}</p>
      </div>
    `;

    card.addEventListener("click", () => openModal(item));
    chartsGrid.appendChild(card);
  });
}

async function loadCharts() {
  chartsGrid.innerHTML = '<div class="empty-state">Liste wird geladen...</div>';
  updateChartCopy();
  updatePagination();

  try {
    const path = currentType === "tv"
      ? `/discover/tv?sort_by=vote_average.desc&vote_count.gte=150&page=${currentPage}`
      : `/discover/movie?sort_by=vote_average.desc&vote_count.gte=150&page=${currentPage}`;

    const data = await fetchData(path);
    totalPages = Math.min(Math.max(Number(data.total_pages || 1), 1), MAX_CHART_PAGES);
    currentPage = Math.min(currentPage, totalPages);
    const items = (data.results || [])
      .filter((item) => item.poster_path)
      .slice(0, 20)
      .map((item) => ({ ...item, media_type: currentType }));

    renderCharts(items);
    updatePagination();
  } catch (error) {
    chartsGrid.innerHTML = `<div class="empty-state">${error.message}</div>`;
  }
}

function setChartType(type) {
  currentType = type === "tv" ? "tv" : "movie";
  currentPage = 1;
  const url = new URL(window.location.href);
  url.searchParams.set("type", currentType);
  url.searchParams.set("page", String(currentPage));
  window.history.replaceState({}, "", url);
  loadCharts();
}

function setChartPage(page) {
  currentPage = Math.min(Math.max(page, 1), totalPages);
  const url = new URL(window.location.href);
  url.searchParams.set("type", currentType);
  url.searchParams.set("page", String(currentPage));
  window.history.replaceState({}, "", url);
  loadCharts();
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

showMoviesBtn.addEventListener("click", () => {
  setChartType("movie");
});

showSeriesBtn.addEventListener("click", () => {
  setChartType("tv");
});

chartsPrevBtn.addEventListener("click", () => {
  setChartPage(currentPage - 1);
});

chartsNextBtn.addEventListener("click", () => {
  setChartPage(currentPage + 1);
});

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

updateChartCopy();
updatePagination();
loadCharts();
initLogoLoopVideo();
