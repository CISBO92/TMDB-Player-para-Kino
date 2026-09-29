/**
 * Base de datos interna de tus enlaces de video directos.
 * Mantenemos tu estructura original intacta.
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

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 * Tu lógica original sincronizada con el contrato estricto de IDs de Kino (id_plugin:id_item)
 */
export async function search(query) {
  await null; 

  if (!query.q && !query.tmdbId) return [];

  if (query.tmdbId) {
    return [{
      id: `tmdb:movie-${query.tmdbId}`,
      ref: `movie|${query.tmdbId}`,
      title: query.q || "Película Vinculada",
      kind: "movie",
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: query.tmdbId }
    }];
  }

  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX&api_key=e21fc412c324d60a57c7164fd063fcde`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      const resultados = data.results || [];
      
      return resultados.map(pelicula => ({
        id: `tmdb:movie-${pelicula.id}`,
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
 * Lógica reparada para conectar los streams reales con soporte para series y películas.
 */
export async function resolve(ref) {
  await null; 
  
  const parts = ref.split("|");
  const kind = parts[0];
  const tmdbId = parts[1];
  
  var urlFinal = "";
  var mimeFinal = "video/mp4";

  if (MIS_VIDEOS[tmdbId]) {
    urlFinal = MIS_VIDEOS[tmdbId].url;
    mimeFinal = MIS_VIDEOS[tmdbId].mime;
  } else {
    if (kind === "series" || ref.indexOf("tv") !== -1) {
      urlFinal = "https://vidsrc.to" + tmdbId + "/1/1"; 
    } else {
      urlFinal = "https://vidsrc.to" + tmdbId;
    }
  }

  return {
    url: urlFinal,
    mime: mimeFinal,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    }
  };
}
