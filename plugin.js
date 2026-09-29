/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

async function fetchTmdb(path) {
  const url = `${TMDB_API}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=es-ES`;
  const r = await kino.fetch(url, { timeoutMs: 10000 });
  if (!r.ok) throw kino.error("unavailable", "Error de comunicación con TMDB.");
  return r.json();
}

// Mapeador nativo con el contrato exacto de Xuper/Archive (id_plugin:id_recurso)
function mapTmdbItem(x) {
  if (!x || !x.id) return null;
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  // Formato oficial obligatorio exigido por el puente de la App
  const uniqueId = `tmdb-player:movie-${rawId}`; 

  return {
    id: uniqueId,
    ref: String(rawId), // Este valor exacto regresará a la función 'resolve'
    title: String(x.title || x.name || "Sin título"),
    kind: "movie",
    year: x.release_date ? String(x.release_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES (CONTRATO DE PRODUCCIÓN KINO) ---

export async function search(query) {
  await Promise.resolve();
  try {
    const data = await fetchTmdb(`/search/movie?query=${encodeURIComponent(query.q)}`);
    if (!data || !data.results) return { items: [] };

    const items = data.results
      .map(x => mapTmdbItem(x))
      .filter(x => x !== null);
      
    return { items: items };
  } catch (error) {
    kino.log("Error en search:", error.message);
    return { items: [] };
  }
}

export async function resolve(ref) {
  await Promise.resolve();
  try {
    const cleanId = String(ref).trim();
    // Enrutamiento directo al servidor embed autorizado en hosts
    const finalUrl = `https://vidsrc.to{cleanId}`;
    
    return {
      url: finalUrl,
      expiresInSeconds: 3600
    };
  } catch (err) {
    kino.log("Error en resolve:", err.message);
    return { url: "" };
  }
}
