/// <reference path="./kino.d.ts" />

const TMDB_API = "https://themoviedb.org";
const TMDB_IMAGE = "https://tmdb.org";
const API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

async function fetchTmdb(path) {
  const url = `${TMDB_API}${path}${path.includes("?") ? "&" : "?"}api_key=${API_KEY}&language=es-ES`;
  const r = await kino.fetch(url, { timeoutMs: 10000 });
  if (!r.ok) throw kino.error("unavailable", "Error de red.");
  return r.json();
}

function mapTmdbItem(x) {
  if (!x || !x.id) return null;
  const rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  return {
    id: `movie-${rawId}`,
    ref: String(rawId),
    title: String(x.title || x.name || "Sin título"),
    kind: "movie",
    year: x.release_date ? String(x.release_date).substring(0, 4) : undefined,
    poster: x.poster_path ? `${TMDB_IMAGE}${x.poster_path}` : undefined,
    backdrop: x.backdrop_path ? `${TMDB_IMAGE}${x.backdrop_path}` : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// PANTALLA DE INICIO: Obligatoria para que la versión 0.9.x muestre el plugin
export async function home() {
  await Promise.resolve();
  const rows = [];
  try {
    const data = await fetchTmdb("/movie/popular");
    if (data && data.results) {
      rows.push({
        id: "tmdb-popular-home",
        title: "Películas Populares (TMDB)",
        ref: "popular-movies",
        items: data.results.map(x => mapTmdbItem(x)).filter(x => x !== null)
      });
    }
  } catch (e) {
    kino.log("Error en home:", e.message);
  }
  return rows;
}

export async function search(query) {
  await Promise.resolve();
  try {
    const data = await fetchTmdb(`/search/movie?query=${encodeURIComponent(query.q)}`);
    if (!data || !data.results) return { items: [] };
    return { items: data.results.map(x => mapTmdbItem(x)).filter(x => x !== null) };
  } catch (error) {
    return { items: [] };
  }
}

export async function resolve(ref) {
  await Promise.resolve();
  try {
    const cleanId = String(ref).replace("movie-", "").trim();
    return {
      url: `https://vidsrc.to{cleanId}`,
      expiresInSeconds: 3600
    };
  } catch (err) {
    return { url: "" };
  }
}
