/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const DEFAULT_API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

function getApiKey() {
  const userKey = kino.config.get("api_key");
  return (userKey && userKey.trim()) ? userKey.trim() : DEFAULT_API_KEY;
}

// Llamada HTTP flexible con reintento automático en inglés si la búsqueda regional falla
async function fetchTmdb(path, lang = "es-ES") {
  const connector = path.includes("?") ? "&" : "?";
  const url = `${TMDB_API}${path}${connector}api_key=${getApiKey()}&language=${lang}`;
  
  const r = await kino.fetch(url, { timeoutMs: 15000 });
  
  if (r.status === 401) throw kino.error("auth_required", "La API Key de TMDB es inválida o expiró.");
  if (r.status === 429) throw kino.error("rate_limited", "Demasiadas peticiones a TMDB.");
  
  // Si no se encuentra con el idioma actual y estábamos buscando en español, reintentamos en inglés
  if (r.status === 404 && lang === "es-ES") {
    return fetchTmdb(path, "en-US");
  }
  
  const contentType = r.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    throw kino.error("unavailable", "El servidor de TMDB devolvió una respuesta inválida (HTML).");
  }
  
  if (!r.ok) throw kino.error("unavailable", `Error de TMDB: ${r.status}`);
  
  return r.json();
}

function mapTmdbItem(x, forcedKind) {
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  const kind = forcedKind || (x.media_type === "tv" || x.first_air_date ? "series" : "movie");
  const stringId = kind + "-" + rawId;

  return {
    id: stringId,
    ref: String(rawId),
    title: String(x.title || x.name || "Sin título"),
    kind: kind,
    year: x.release_date || x.first_air_date ? String(x.release_date || x.first_air_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES ---

export async function search(query) {
  // Evitamos que cualquier fallo de red o parseo tire abajo el buscador completo
  try {
    let endpoint = "/search/multi";
    let forcedKind = null;
    
    if (query.type === "movie") {
      endpoint = "/search/movie";
      forcedKind = "movie";
    } else if (query.type === "series") {
      endpoint = "/search/tv";
      forcedKind = "series";
    }
    
    const pageParam = query.cursor ? `&page=${query.cursor}` : "";
    const data = await fetchTmdb(`${endpoint}?query=${encodeURIComponent(query.q)}${pageParam}`);
    
    // Si el servidor responde correctamente pero viene vacío, devolvemos lista vacía con elegancia
    if (!data || !data.results) {
      return { items: [] };
    }

    const items = data.results
      .filter(x => x && x.media_type !== "person" && x.id !== undefined)
      .map(x => mapTmdbItem(x, forcedKind))
      .filter(x => x !== null);
      
    return {
      items: items,
      next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
    };
  } catch (error) {
    // En lugar de romper la app con un "unavailable", registramos el error interno en logs 
    // y le devolvemos a Kino una lista vacía para que no salte el cartel rojo.
    kino.log("Error controlado en buscador:", error.message);
    return { items: [] };
  }
}

export async function home() {
  const rows = [];
  try {
    const moviesData = await fetchTmdb("/movie/popular");
    if (moviesData && moviesData.results) {
      rows.push({
        id: "tmdb-movies-popular",
        title: "Películas Populares",
        ref: "discover-movies",
        items: moviesData.results.map(x => mapTmdbItem(x, "movie")).filter(x => x !== null)
      });
    }
  } catch (e) {
    kino.log("Error en home movies:", e.message);
  }
  
  try {
    const tvData = await fetchTmdb("/tv/popular");
    if (tvData && tvData.results) {
      rows.push({
        id: "tmdb-tv-popular",
        title: "Series Populares",
        ref: "discover-tv",
        items: tvData.results.map(x => mapTmdbItem(x, "series")).filter(x => x !== null)
      });
    }
  } catch (e) {
    kino.log("Error en home tv:", e.message);
  }
  return rows;
}

export async function browse(ref, cursor) {
  try {
    const page = cursor ? parseInt(cursor) : 1;
    const isTv = ref === "discover-tv";
    const endpoint = isTv ? "/tv/popular" : "/movie/popular";
    const forcedKind = isTv ? "series" : "movie";
    
    const data = await fetchTmdb(`${endpoint}?page=${page}`);
    return {
      items: (data.results || []).map(x => mapTmdbItem(x, forcedKind)).filter(x => x !== null),
      next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
    };
  } catch (e) {
    return { items: [] };
  }
}

export async function episodes(ref) {
  const seriesData = await fetchTmdb(`/tv/${ref}`);
  const episodesList = [];
  const seasons = seriesData.seasons || [];
  
  for (const season of seasons) {
    if (season.season_number === 0) continue;
    try {
      const seasonData = await fetchTmdb(`/tv/${ref}/season/${season.season_number}`);
      const eps = seasonData.episodes || [];
      
      eps.forEach(e => {
        episodesList.push({
          season: season.season_number,
          number: e.episode_number,
          ref: `tv-${ref}-${season.season_number}-${e.episode_number}`,
          title: e.name || `Episodio ${e.episode_number}`,
          overview: e.overview || undefined,
          still: e.still_path ? `${TMDB_IMAGE}${e.still_path}` : undefined,
          airDate: e.air_date || undefined
        });
      });
    } catch (err) {
      kino.log(`Error en temporada ${season.season_number}:`, err.message);
    }
  }
  
  return {
    series: {
      title: seriesData.name,
      overview: seriesData.overview,
      poster: seriesData.poster_path ? `${TMDB_IMAGE}${seriesData.poster_path}` : undefined,
      backdrop: seriesData.backdrop_path ? `${TMDB_IMAGE}${seriesData.backdrop_path}` : undefined
    },
    episodes: episodesList
  };
}

export async function resolve(ref) {
  await null; 
  let playerUrl = "";
  
  if (ref.startsWith("tv-")) {
    const parts = ref.split("-");
    playerUrl = "https://vidsrc.to" + parts[1] + "/" + parts[2] + "/" + parts[3];
  } else {
    playerUrl = "https://vidsrc.to" + ref;
  }
  
  return {
    url: playerUrl,
    expiresInSeconds: 3600
  };
}
