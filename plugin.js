/**
 * Base de datos interna de tus enlaces de video directos.
 * Usamos el enlace .m3u8 de transmisión de VideoJS como prueba universal estable.
 */
const MIS_VIDEOS = {
  "237305": { 
    url: "https://zencdn.net",
    mime: "video/mp4"
  },
  "550": { 
    url: "https://zencdn.net",
    mime: "video/mp4"
  }
};

const VIDEO_RESPALDO = "https://zencdn.net";

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 */
export async function search(query) {
  await null; 

  if (!query.q && !query.tmdbId) return [];

  if (query.tmdbId) {
    return [{
      id: `tmdb-${query.tmdbId}`,
      ref: `movie|${query.tmdbId}`,
      title: query.q || "Película Vinculada",
      kind: "movie",
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: query.tmdbId }
    }];
  }

  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      const resultados = data.results || [];
      
      return resultados.map(pelicula => ({
        id: `tmdb-${pelicula.id}`,
        ref: `movie|${pelicula.id}`,
        title: pelicula.title,
        kind: "movie",
        year: pelicula.release_date ? pelicula.release_date.split("-") : undefined,
        ids: { tmdb: pelicula.id }
      }));
    }
  } catch (err) {
    return [];
  }

  return [];
}

/**
 * 2. CAPACIDAD DE RESOLUCIÓN (resolve)
 */
export async function resolve(ref) {
  await null; 
  
  const [kind, tmdbId] = ref.split("|");
  const videoEncontrado = MIS_VIDEOS[tmdbId];
  let urlFinal = videoEncontrado ? videoEncontrado.url : VIDEO_RESPALDO;
  let mimeFinal = videoEncontrado ? videoEncontrado.mime : "video/mp4";

  return {
    url: urlFinal,
    mime: mimeFinal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    }
  };
}
