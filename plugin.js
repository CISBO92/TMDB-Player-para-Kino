/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const DEFAULT_API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

function getApiKey() {
  const userKey = kino.config.get("api_key");
  return (userKey && userKey.trim()) ? userKey.trim() : DEFAULT_API_KEY;
}

async function fetchTmdb(path, lang = "es-ES") {
  const connector = path.includes("?") ? "&" : "?";
  const url = TMDB_API + path + connector + "api_key=" + getApiKey() + "&language=" + lang;
  
  const r = await kino.fetch(url, { timeoutMs: 15000 });
  
  if (r.status === 401) throw kino.error("auth_required", "La API Key de TMDB es inválida o expiró.");
  if (r.status === 429) throw kino.error("rate_limited", "Demasiadas peticiones a TMDB.");
  
  if (r.status === 404 && lang === "es-ES") {
    return fetchTmdb(path, "en-US");
  }
  
  const contentType = r.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    throw kino.error("unavailable", "El servidor de TMDB devolvió una respuesta inválida (HTML).");
  }
  
  if (!r.ok) throw kino.error("unavailable", "Error de red.");
  return r.json();
}

function mapTmdbItem(x, forcedKind) {
  if (!x || !x.id) return null;
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  const kind = forcedKind || ((x.media_type === "tv" || x.first_air_date) ? "series" : "movie");
  
  return {
    id: kind + "-" + rawId,
    ref: String(rawId),
    title: String(x.title || x.name || "Sin título"),
    kind: kind,
    year: x.release_date || x.first_air_date ? String(x.release_date || x.first_air_date).substring(0, 4) : undefined,
    poster: x.poster_path ? (TMDB_IMAGE + x.poster_path) : undefined,
    backdrop: x.backdrop_path ? (TMDB_IMAGE + x.backdrop_path) : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES REQUERIDAS ---

export async function search(query) {
  await Promise.resolve();
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
    
    const pageParam = query.cursor ? ("&page=" + query.cursor) : "";
    const data = await fetchTmdb(endpoint + "?query=" + encodeURIComponent(query.q) + pageParam);
    
    if (!data || !data.results) return { items: [] };

    const items = data.results
      .filter(function(x) { return x && x.media_type !== "person" && x.id !== undefined; })
      .map(function(x) { return mapTmdbItem(x, forcedKind); })
      .filter(function(x) { return x !== null; });
      
    return {
      items: items,
      next: (data.page < data.total_pages) ? String(data.page + 1) : undefined
    };
  } catch (error) {
    kino.log("Error controlado en buscador:", error.message);
    return { items: [] };
  }
}

export async function resolve(ref) {
  // Aislamiento completo de hilos de ejecución asíncronos
  await Promise.resolve();
  
  try {
    const cleanRef = String(ref).trim();
    
    // Si la referencia contiene guiones, es una serie estructurada (tv-id-temporada-episodio)
    if (cleanRef.includes("-")) {
      const parts = cleanRef.split("-");
      // Manejo seguro de índices sin desestructuración nativa conflictiva
      const tmdbId = parts[0] === "tv" ? parts[1] : parts[0];
      const season = parts[0] === "tv" ? parts[2] : parts[1];
      const episode = parts[0] === "tv" ? parts[3] : parts[2];
      
      return {
        url: "https://vidsrc.to" + tmdbId + "/" + season + "/" + episode,
        expiresInSeconds: 3600
      };
    }
    
    // Si NO tiene guiones, es una película directa. Pasamos el ID numérico limpio directamente sin alteraciones.
    return {
      url: "https://vidsrc.to" + cleanRef,
      expiresInSeconds: 3600
    };
  } catch (err) {
    kino.log("Error crítico en resolve:", err.message);
    throw kino.error("unavailable", "No se pudo generar el enlace de reproducción.");
  }
}

export async function home() {
  await Promise.resolve();
  const rows = [];
  try {
    const moviesData = await fetchTmdb("/movie/popular");
    if (moviesData && moviesData.results) {
      rows.push({
        id: "tmdb-movies-popular",
        title: "Películas Populares",
        ref: "discover-movies",
        items: moviesData.results.map(function(x) { return mapTmdbItem(x, "movie"); }).filter(function(x) { return x !== null; })
      });
    }
  } catch (e) {
    kino.log("Error en home:", e.message);
  }
  return rows;
}

export async function browse(ref, cursor) {
  await Promise.resolve();
  return { items: [] };
}

export async function episodes(ref) {
  await Promise.resolve();
  return { series: { title: "Serie" }, episodes: [] };
}
