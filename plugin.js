/**
 * Base de datos interna de tus enlaces de video directos.
 * Como desarrollador, aquí es donde irás añadiendo los IDs de TMDB de las películas 
 * y sus correspondientes enlaces puros (.mp4 o .m3u8).
 */
const MIS_VIDEOS = {
  "550": { // ID de TMDB para "El Club de la Pelea" (Fight Club) como ejemplo
    url: "https://googleapis.com",
    mime: "video/mp4"
  },
  "272": { // ID de TMDB para "Batman Inicia" (Batman Begins) como ejemplo
    url: "https://googleapis.com",
    mime: "video/mp4"
  }
};

// Enlace de respaldo por si el usuario busca una película que aún no has agregado a tu lista
const VIDEO_RESPALDO = "https://googleapis.com";

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 * Consulta a TMDB para pintar la interfaz de Kino con pósteres y metadatos elegantes.
 */
export async function search(query) {
  // Evita el Rejection Trap inicial exigido por el motor QuickJS de Kino
  await null; 

  if (!query.q && !query.tmdbId) return [];

  // Si Kino ya nos provee el ID de TMDB (porque el usuario abrió el título desde el catálogo interno)
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

  // Si el usuario escribe texto en el buscador, consultamos dinámicamente a la API de TMDB
  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      const resultados = data.results || [];
      
      // Mapeamos los resultados de TMDB al formato exacto que exige el catálogo de Kino
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
    // Si la API de TMDB falla, no rompemos la app, devolvemos un array vacío
    return [];
  }

  return [];
}

/**
 * 2. CAPACIDAD DE RESOLUCIÓN (resolve)
 * Toma el ID de la película y entrega el archivo multimedia directo libre de encriptación.
 */
export async function resolve(ref) {
  await null;
  
  const [kind, tmdbId] = ref.split("|");
  
  // Buscamos si tenemos esa película en nuestra base de datos de enlaces limpios
  const videoEncontrado = MIS_VIDEOS[tmdbId];
  
  if (videoEncontrado) {
    return {
      url: videoEncontrado.url,
      mime: videoEncontrado.mime,
      headers: {
        "User-Agent": `KinoApp/${kino.appVersion} (Hybrid-Catalog-Dev)`
      }
    };
  }

  // Si no la tienes agregada aún, reproduce el video de respaldo para demostrar que el plugin no falla
  return {
    url: VIDEO_RESPALDO,
    mime: "video/mp4",
    headers: {
      "User-Agent": `KinoApp/${kino.appVersion} (Hybrid-Catalog-Dev)`
    }
  };
}
