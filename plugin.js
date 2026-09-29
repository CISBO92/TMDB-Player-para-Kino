/**
 * URL "RAW" DEFINITIVA DE TU GITHUB GIST
 * El plugin consultará este enlace remotamente en tiempo real cada vez que se reproduzca contenido [1.2].
 */
const URL_BASE_DATOS = "https://githubusercontent.com";

// Video de respaldo por si el servidor de Gist falla o la base de datos está vacía
const VIDEO_RESPALDO = "http://ddns.net";

/**
 * Función interna para conectarse a tu bloc de notas en la nube de forma asíncrona
 */
async function obtenerNubePrivada() {
  try {
    const respuesta = await kino.fetch(URL_BASE_DATOS);
    if (respuesta && respuesta.ok) {
      return respuesta.json();
    }
  } catch (err) {
    // Si falla el servidor remoto de Gist, devolvemos un mapa vacío para no congelar Kino
  }
  return {};
}

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 * Sincroniza las búsquedas con la API de TMDB para inyectar sinopsis y carátulas estéticas.
 */
export async function search(query) {
  await null; // Evita el Rejection Trap inicial exigido por QuickJS [1.2]

  if (!query.q && !query.tmdbId) return [];

  // Si abrimos la ficha técnica directamente desde el catálogo general interno
  if (query.tmdbId) {
    const esSerie = query.type === "series";
    return [{
      id: `tg-${query.tmdbId}`,
      ref: `${esSerie ? "series" : "movie"}|${query.tmdbId}`,
      title: query.q || "Contenido Privado",
      kind: esSerie ? "series" : "movie",
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: query.tmdbId }
    }];
  }

  // Consulta dinámica en los servidores globales de TMDB (Películas y Series de anime)
  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      return (data.results || [])
        .filter(item => item.media_type === "movie" || item.media_type === "tv")
        .map(item => {
          const esSerie = item.media_type === "tv";
          return {
            id: `tg-${item.id}`,
            ref: `${esSerie ? "series" : "movie"}|${item.id}`,
            title: item.title || item.name,
            kind: esSerie ? "series" : "movie",
            year: item.release_date || item.first_air_date ? (item.release_date || item.first_air_date).split("-") : undefined,
            ids: { tmdb: item.id }
          };
        });
    }
  } catch (err) {
    return [];
  }
  return [];
}

/**
 * 2. CAPACIDAD DE EPISODIOS (episodes)
 * Desglosa de forma automatizada las temporadas y capítulos reales usando los metadatos de TMDB.
 */
export async function episodes(ref) {
  await null;
  const [kind, tmdbId] = ref.split("|");

  if (kind !== "series") return { episodes: [] };

  const urlTMDB = `https://themoviedb.org{tmdbId}?api_key=c5e7b154746f363065a6e811f5fae448&language=es-MX`;
  let listaEpisodios = [];

  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const datosSerie = res.json();
      const temporadas = datosSerie.seasons || [];

      for (const temp of temporadas) {
        if (temp.season_number === 0) continue; // Ignoramos los capítulos especiales o extras
        
        for (let i = 1; i <= temp.episode_count; i++) {
          listaEpisodios.push({
            season: temp.season_number,
            number: i,
            ref: `tv|${tmdbId}|${temp.season_number}|${i}`,
            title: `Episodio ${i}`
          });
        }
      }
    }
  } catch (err) {
    listaEpisodios = [];
  }

  // Plan de respaldo de emergencia si TMDB llega a saturar la IP
  if (listaEpisodios.length === 0) {
    for (let i = 1; i <= 24; i++) {
      listaEpisodios.push({
        season: 1,
        number: i,
        ref: `tv|${tmdbId}|1|${i}`,
        title: `Episodio ${i}`
      });
    }
  }

  return { episodes: listaEpisodios };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN (resolve)
 * Descarga dinámicamente tu JSON de Gist en tiempo real y extrae la ruta del video [1.2].
 */
export async function resolve(ref) {
  await null; 
  const parts = ref.split("|");
  const kind = parts[0];
  const tmdbId = parts[1];

  let urlFinal = VIDEO_RESPALDO;

  // CONSULTA EN TIEMPO REAL: Viaja a tu enlace de Gist y descarga los links actualizados [1.2]
  const miNubeDinamica = await obtenerNubePrivada();

  if (kind === "movie") {
    // Extracción para películas independientes
    const contenido = miNubeDinamica[tmdbId];
    if (contenido && !contenido.tv) {
      urlFinal = contenido.url;
    }
  } else if (kind === "tv") {
    // Extracción para series organizadas: "tv|tmdbId|temporada|episodio"
    const season = parts[2];
    const episode = parts[3];
    const serieData = miNubeDinamica[tmdbId];
    
    if (serieData && serieData.tv && serieData.episodios) {
      const claveEpisodio = `${season}_${episode}`;
      if (serieData.episodios[claveEpisodio]) {
        urlFinal = serieData.episodios[claveEpisodio];
      }
    }
  }

  return {
    url: urlFinal,
    mime: "video/mp4",
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    }
  };
}
