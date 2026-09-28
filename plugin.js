/**
 * Base de datos interna de tus enlaces de video directos.
 * Vinculamos el ID de TMDB de "Silent Hill: Ascension" (237305) al video directo de prueba.
 */
const MIS_VIDEOS = {
  "237305": { 
    url: "https://googleapis.com",
    mime: "video/mp4"
  },
  "550": { // ID de TMDB para "El Club de la Pelea" (Fight Club) de respaldo
    url: "https://googleapis.com",
    mime: "video/mp4"
  }
};

// Enlace de respaldo por si buscas un título que no está registrado arriba
const VIDEO_RESPALDO = "https://googleapis.com";

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 * Consulta a TMDB para inyectar la interfaz de Kino con las sinopsis y pósteres.
 */
export async function search(query) {
  // Evita el Rejection Trap inicial exigido por el motor QuickJS de Kino [1.2]
  await null; 

  if (!query.q && !query.tmdbId) return [];

  // Si Kino ya nos provee el ID de TMDB directamente desde la interfaz
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

  // Búsqueda dinámica en los servidores oficiales de la API de TMDB
  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      const resultados = data.results || [];
      
      // Mapeamos los resultados de TMDB al contrato de datos exigido por Kino
      return resultados.map(pelicula => ({
        id: `tmdb-${pelicula.id}`,
        ref: `movie|${pelicula.id}`,
        title: pelicula.title,
        kind: "movie",
        year: pelicula.release_date ? pelicula.release_date.split("-")[0] : undefined,
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
 * Entrega a Kino la ruta multimedia directa sin encriptación.
 */
export async function resolve(ref) {
  // Inicialización asíncrona obligatoria
  await null; 
  
  const [kind, tmdbId] = ref.split("|");
  
  // Verificamos si el ID de TMDB (ej. 237305) existe en nuestro mapa de videos directos
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
