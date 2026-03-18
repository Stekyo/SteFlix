const API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyZmM1ZmQxNWUyOWYwNGFhMWViMDBhMjM1NDBlYzk5ZiIsIm5iZiI6MTc1OTYwODY5Mi41Miwic3ViIjoiNjhlMTdmNzQwYzU1YTBiYzZlZjgxMTMwIiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9._Z9tR5CyxKtMqZtPB3MktpfU3TflvwnaVk3fNVNPoMs";
const API_BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%23d2d2d7'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%236e6e73' font-family='Segoe UI, Arial, sans-serif' font-size='34'%3EKein Poster%3C/text%3E%3C/svg%3E";

const logoLoopVideo = document.getElementById("logoLoopVideo");
const rankingList = document.getElementById("rankingList");
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

let favorites = loadFavorites();

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
}

function buildRatingOptions(selectedRating) {
  return [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
    .map((rating) => `<option value="${rating}" ${Number(selectedRating) === rating ? "selected" : ""}>${rating}</option>`)
    .join("");
}

async function fetchData(path) {
  if (!hasApiKey()) {
    throw new Error("TMDB API-Key fehlt. Trage ihn in ranking-page.js ein.");
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

function renderRanking() {
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
            ${buildRatingOptions(Number(item.userRating || 10))}
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

sortFavoritesByRating();
renderRanking();

modalClose.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

initLogoLoopVideo();
