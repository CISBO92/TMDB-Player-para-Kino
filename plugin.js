/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
// Tu API Key integrada de forma segura como respaldo principal
const DEFAULT_API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

// Obtiene la API Key (prioriza la del menú Configurar, si no, usa la tuya)
function getApiKey() {
  const userKey = kino.config.get("api_key");
  return (userKey && userKey.trim()) ? userKey.trim() : DEFAULT_API_KEY;
}

// Llamada HTTP segura y protegida contra respuestas HTML inesperadas
async function fetchTmdb(path) {
  const connector = path.includes("?") ? "&" : "?";
  const url = `${TMDB_API}${path}${connector}api_key=${getApiKey()}&language=es-ES`;
  
  const r = await kino.fetch(url, { timeoutMs: 15000 });
  
  // Validaciones de códigos de estado HTTP estándar
  if (r.status === 401) throw kino.error("auth_required", "La API Key de TMDB es inválida o expiró.");
  if (r.status === 404) throw kino.error("not_found", "No se encontró el recurso en TMDB.");
  if (r.status === 429) throw kino.error("rate_limited", "Demasiadas peticiones a TMDB.");
  
  // ¡Solución al error del token '<'!: Verificar que la respuesta sea JSON legítimo
  const contentType = r.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    kino.log("Error crítico: TMDB no devolvió JSON. Tipo recibido: " + contentType);
    throw kino.error("unavailable", "El servidor de TMDB devolvió una respuesta inválida (HTML). Intenta de nuevo.");
  }
  
  if (!r.ok) throw kino.error("unavailable", `Error de TMDB: ${r.status}`);
  
  return r.json();
}

// Mapea los resultados al formato estricto de Kino (Item)
function mapTmdbItem(x, forcedKind) {
  const kind = forcedKind || (x.media_type === "tv" || x.first_air_date ? "series" : "movie");
  const id = `${kind}-${x.id}`;
  
  return {
    id: id,
    ref: String(x.id),
    title: x.title || x.name || "Sin título",
    kind: kind,
    year: x.release_date || x.first_air_date ? (x.release_date || x.first_air_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview || undefined,
    ids: { tmdb: parseInt(x.id) } // Enriquecimiento automático de fichas
  };
}

// --- CAPABILITIES (KINO CONTRACT) ---

// 1. Buscador global
export async function search(query) {
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
  
  const items = (data.results || [])
    .filter(x => x.media_type !== "person")
    .map(x => mapTmdbItem(x, forcedKind));
    
  return {
    items: items,
    next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
  };
}

// 2. Carruseles de la pantalla de inicio
export async function home() {
  const rows = [];
  
  try {
    const moviesData = await fetchTmdb("/movie/popular");
    if (moviesData.results && moviesData.results.length) {
      rows.push({
        id: "tmdb-movies-popular",
        title: "Películas Populares",
        ref: "discover-movies",
        items: moviesData.results.map(x => mapTmdbItem(x, "movie"))
      });
    }
  } catch (e) {
    kino.log("Error cargando películas populares:", e.message);
  }
  
  try {
    const tvData = await fetchTmdb("/tv/popular");
    if (tvData.results && tvData.results.length) {
      rows.push({
        id: "tmdb-tv-popular",
        title: "Series Populares",
        ref: "discover-tv",
        items: tvData.results.map(x => mapTmdbItem(x, "series"))
      });
    }
  } catch (e) {
    kino.log("Error cargando series populares:", e.message);
  }
  
  return rows;
}

// 3. Paginación e interfaz de exploración ("Ver más")
export async function browse(ref, cursor) {
  const page = cursor ? parseInt(cursor) : 1;
  const isTv = ref === "discover-tv";
  const endpoint = isTv ? "/tv/popular" : "/movie/popular";
  const forcedKind = isTv ? "series" : "movie";
  
  const data = await fetchTmdb(`${endpoint}?page=${page}`);
  
  return {
    items: (data.results || []).map(x => mapTmdbItem(x, forcedKind)),
    next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
  };
}

// 4. Listado de temporadas y capítulos
export async function episodes(ref) {
  const seriesData = await fetchTmdb(`/tv/${ref}`);
  const episodesList = [];
  const seasons = seriesData.seasons || [];
  
  for (const season of seasons) {
    if (season.season_number === 0) continue; // Ignorar contenido especial sin orden lineal
    
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

// 5. Generación del enlace del reproductor
export async function resolve(ref) {
  await null; // Prevenir "rejection traps" en promesas síncronas
  
  let playerUrl = "";
  
  if (ref.startsWith("tv-")) {
    const parts = ref.split("-");
    const tmdbId = parts[1];
    const season = parts[2];
    const episode = parts[3];
    // Servidor de video vidsrc por defecto balanceado para series
    playerUrl = `https://vidsrc.to{tmdbId}/${season}/${episode}`;
  } else {
    // Balanceado para películas usando el ID directo de TMDB
    playerUrl = `https://vidsrc.to{ref}`;
  }
  
  return {
    url: playerUrl,
    expiresInSeconds: 3600
  };
}
