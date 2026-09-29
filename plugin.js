/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const DEFAULT_API_KEY = "8444212ba6be27e41adbb20a05c8531c"; // Clave pública demo o de respaldo

// Helper para obtener la API Key configurada por el usuario o usar la de respaldo
function getApiKey() {
  const userKey = kino.config.get("api_key");
  return (userKey && userKey.trim()) ? userKey.trim() : DEFAULT_API_KEY;
}

// Helper seguro para llamadas HTTP según las reglas de Kino.
// El primer 'await' va al inicio para evitar romper el try/catch del llamador (rejection trap).
async function fetchTmdb(path) {
  const connector = path.includes("?") ? "&" : "?";
  const url = `${TMDB_API}${path}${connector}api_key=${getApiKey()}&language=es-ES`;
  
  const r = await kino.fetch(url, { timeoutMs: 15000 });
  
  if (r.status === 401) throw kino.error("auth_required", "La API Key de TMDB es inválida o expiró.");
  if (r.status === 404) throw kino.error("not_found", "No se encontró el recurso en TMDB.");
  if (r.status === 429) throw kino.error("rate_limited", "Demasiadas peticiones a TMDB.");
  if (!r.ok) throw kino.error("unavailable", `Error de TMDB: ${r.status}`);
  
  return r.json();
}

// Mapea un objeto de película/serie de TMDB al formato estricto 'Item' de Kino
// Cumple con la regla de IDs: ^[A-Za-z0-9._~-]{1,128}\$
function mapTmdbItem(x, forcedKind) {
  const kind = forcedKind || (x.media_type === "tv" || x.first_air_date ? "series" : "movie");
  const id = `${kind}-${x.id}`; // Formato limpio: movie-1234 o series-5678
  
  return {
    id: id,
    ref: String(x.id), // Pasamos solo el ID numérico real a las funciones de resolución
    title: x.title || x.name || "Sin título",
    kind: kind,
    year: x.release_date || x.first_air_date ? (x.release_date || x.first_air_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview || undefined,
    ids: { tmdb: parseInt(x.id) } // Enriquecimiento automático de ficha en Kino
  };
}

// --- CAPABILITES REQUERIDAS ---

// 1. Búsqueda de contenido (search)
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
    
  const nextPage = (data.page < data.total_pages) ? String(data.page + 1) : undefined;
  
  return {
    items: items,
    next: nextPage
  };
}

// 2. Pantalla de Inicio (home)
export async function home() {
  // Envolvemos las solicitudes en bloques independientes para que si una falla, las demás rows carguen
  const rows = [];
  
  try {
    const moviesData = await fetchTmdb("/movie/popular");
    if (moviesData.results && moviesData.results.length) {
      rows.push({
        id: "tmdb-movies-popular",
        title: "Películas Populares (TMDB)",
        ref: "discover-movies",
        items: moviesData.results.map(x => mapTmdbItem(x, "movie"))
      });
    }
  } catch (e) {
    kino.log("Error cargando fila de películas populares", e.message);
  }
  
  try {
    const tvData = await fetchTmdb("/tv/popular");
    if (tvData.results && tvData.results.length) {
      rows.push({
        id: "tmdb-tv-popular",
        title: "Series Populares (TMDB)",
        ref: "discover-tv",
        items: tvData.results.map(x => mapTmdbItem(x, "series"))
      });
    }
  } catch (e) {
    kino.log("Error cargando fila de series populares", e.message);
  }
  
  return rows;
}

// 3. Paginación de portadas / "Ver más" (browse)
export async function browse(ref, cursor) {
  const page = cursor ? parseInt(cursor) : 1;
  let endpoint = ref === "discover-tv" ? "/tv/popular" : "/movie/popular";
  let forcedKind = ref === "discover-tv" ? "series" : "movie";
  
  const data = await fetchTmdb(`${endpoint}?page=${page}`);
  
  return {
    items: (data.results || []).map(x => mapTmdbItem(x, forcedKind)),
    next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
  };
}

// 4. Desglose de Temporadas y Episodios (episodes)
export async function episodes(ref) {
  // Primero obtenemos los detalles de la serie para saber cuántas temporadas tiene
  const seriesData = await fetchTmdb(`/tv/${ref}`);
  const episodesList = [];
  
  // Iteramos de manera segura por las temporadas de la serie
  // Nota: Limitamos a peticiones simultáneas o consecutivas cuidando el límite de 60 peticiones de Kino
  const seasons = seriesData.seasons || [];
  
  for (const season of seasons) {
    // Saltamos la temporada 0 (Especiales) si deseas una lista limpia o la incluyes si la requieres. 
    // La guía de Kino indica que los episodios deben numerarse desde el 1 en adelante.
    if (season.season_number === 0) continue;
    
    try {
      const seasonData = await fetchTmdb(`/tv/${ref}/season/${season.season_number}`);
      const eps = seasonData.episodes || [];
      
      eps.forEach(e => {
        episodesList.push({
          season: season.season_number,
          number: e.episode_number,
          ref: `tv-${ref}-${season.season_number}-${e.episode_number}`, // Ref estructurado para resolver luego
          title: e.name || `Episodio ${e.episode_number}`,
          overview: e.overview || undefined,
          still: e.still_path ? `${TMDB_IMAGE}${e.still_path}` : undefined,
          airDate: e.air_date || undefined
        });
      });
    } catch (err) {
      kino.log(`Error obteniendo la temporada ${season.season_number}`, err.message);
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

// 5. Resolución de enlaces de reproducción (resolve)
export async function resolve(ref) {
  // El primer await asegura que el entorno asíncrono no cause fallos silenciosos no capturados.
  await null; 
  
  let videoUrl = "";
  
  if (ref.startsWith("tv-")) {
    // Formato de ref de series: tv-{tmdbId}-{season}-{episode}
    const parts = ref.split("-");
    const tmdbId = parts[1];
    const season = parts[2];
    const episode = parts[3];
    
    // Ejemplo usando la API/Embed pública de vidsrc.to para series
    videoUrl = `https://vidsrc.to{tmdbId}/${season}/${episode}`;
  } else {
    // Para películas, el 'ref' directo es solo el ID de TMDB numérico enviado por mapTmdbItem
    videoUrl = `https://vidsrc.to{ref}`;
  }
  
  // Devolvemos el Stream estructurado para el reproductor interno de Kino
  return {
    url: videoUrl,
    // Dejamos que Kino detecte el tipo (HLS/DASH/HTML5) automáticamente si el provider hace redirects internos
    expiresInSeconds: 3600 
  };
}
