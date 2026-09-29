/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

// Solicitud de red directa
async function fetchTmdb(path) {
  const url = `${TMDB_API}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=es-ES`;
  const r = await kino.fetch(url, { timeoutMs: 10000 });
  
  if (!r.ok) throw kino.error("unavailable", "Error de red.");
  return r.json();
}

// Mapeador ultra seguro usando Literales de Plantilla contra el error '17.s'
function mapTmdbItem(x) {
  if (!x || !x.id) return null;
  
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  // Forzamos comillas invertidas estrictas. Evita la concatenación con '+' que rompe el motor QuickJS
  const safeId = `movie-${rawId}`; 
  const safeRef = String(rawId);

  return {
    id: safeId,
    ref: safeRef,
    title: String(x.title || x.name || "Sin título"),
    kind: "movie",
    year: x.release_date ? String(x.release_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES (CONTRATO MINIMALISTA) ---

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
    return { items: [] };
  }
}

export async function resolve(ref) {
  await Promise.resolve();
  try {
    // Limpieza absoluta de la referencia para que no herede residuos de Java
    const cleanId = String(ref).replace("movie-", "").trim();
    const finalUrl = `https://vidsrc.to{cleanId}`;
    
    return {
      url: finalUrl,
      expiresInSeconds: 3600
    };
  } catch (err) {
    return { url: "" };
  }
}
