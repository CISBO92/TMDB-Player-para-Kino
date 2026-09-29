/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const API_KEY = "e21fc412c324d60a57c7164fd063fcde"; // Tu API Key fija y funcional

// Solicitud HTTP directa y veloz bajo las reglas de la app
async function fetchTmdb(path) {
  const connector = path.includes("?") ? "&" : "?";
  const url = TMDB_API + path + connector + "api_key=" + API_KEY + "&language=es-ES";
  
  const r = await kino.fetch(url, { timeoutMs: 10000 });
  
  if (!r.ok) throw kino.error("unavailable", "Error de conexión con TMDB.");
  return r.json();
}

// Mapeador básico de ítems enfocado únicamente en Películas para evitar errores de tipo
function mapTmdbItem(x) {
  if (!x || !x.id) return null;
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  return {
    id: "movie-" + rawId,
    ref: String(rawId),
    title: String(x.title || x.name || "Sin título"),
    kind: "movie",
    year: x.release_date ? String(x.release_date).substring(0, 4) : undefined,
    poster: x.poster_path ? (TMDB_IMAGE + x.poster_path) : undefined,
    backdrop: x.backdrop_path ? (TMDB_IMAGE + x.backdrop_path) : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES PERMITIDAS POR EL DESARROLLADOR ---

// 1. Búsqueda directa (search)
export async function search(query) {
  await Promise.resolve();
  try {
    // Forzamos la búsqueda exclusiva en el catálogo de películas para máxima compatibilidad
    const endpoint = "/search/movie";
    const data = await fetchTmdb(endpoint + "?query=" + encodeURIComponent(query.q));
    
    if (!data || !data.results) return { items: [] };

    const items = data.results
      .map(function(x) { return mapTmdbItem(x); })
      .filter(function(x) { return x !== null; });
      
    return {
      items: items
    };
  } catch (error) {
    kino.log("Error en búsqueda:", error.message);
    return { items: [] };
  }
}

// 2. Extracción instantánea del reproductor (resolve)
export async function resolve(ref) {
  await Promise.resolve();
  try {
    const cleanId = String(ref).trim().replace("movie-", "");
    
    // Retornamos el formato de transmisión directo al host vidsrc.to autorizado en el manifiesto
    return {
      url: "https://vidsrc.to" + cleanId,
      expiresInSeconds: 3600
    };
  } catch (err) {
    return { url: "" };
  }
}
