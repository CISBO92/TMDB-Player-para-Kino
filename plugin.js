/**
 * Base de datos interna de tus enlaces de video directos.
 * Mantenemos tu estructura original intacta.
 *//**
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

// Helpers de configuración de TMDB
var TMDB_IMAGE_BASE = "https://tmdb.org";
var TMDB_API_KEY = "e21fc412c324d60a57c7164fd063fcde";

/**
 * 1. CAPACIDAD DE BÚSQUEDA Y ENRIQUECIMIENTO (search)
 * Modificada para realizar consultas en paralelo y traer Elenco, Sinopsis y Tráilers nativos.
 */
export async function search(query) {
  await null; 

  if (!query.q && !query.tmdbId) return [];

  // SI KINO SOLICITA LOS METADATOS DE UNA FICHA VINCULADA
  if (query.tmdbId) {
    var idLimpio = String(query.tmdbId).replace("movie-", "").replace("series-", "");
    var kind = query.kind || "movie";
    var endpoint = kind === "series" ? "/tv/" : "/movie/";
    
    // Consultas en paralelo para armar la espectacular ficha visual sin retrasos
    var urlDetalles = "https://themoviedb.org" + endpoint + idLimpio + "?language=es-MX&api_key=" + TMDB_API_KEY + "&append_to_response=credits,videos";
    
    try {
      var res = await kino.fetch(urlDetalles);
      if (res && res.ok) {
        var movieData = res.json();
        
        // 1. Mapeamos el Elenco (Fotos redondas de actores)
        var elencoMapeado = [];
        if (movieData.credits && movieData.credits.cast) {
          var castLimit = Math.min(movieData.credits.cast.length, 12); // Limitamos a los 12 principales
          for (var c = 0; c < castLimit; c++) {
            var actor = movieData.credits.cast[c];
            elencoMapeado.push({
              name: String(actor.name),
              character: String(actor.character || "Actor"),
              image: actor.profile_path ? (TMDB_IMAGE_BASE + actor.profile_path) : undefined
            });
          }
        }

        // 2. Mapeamos los Videos (Tráilers Oficiales con botón de Play)
        var videosMapeados = [];
        if (movieData.videos && movieData.videos.results) {
          for (var v = 0; v < movieData.videos.results.length; v++) {
            var video = movieData.videos.results[v];
            if (video.site === "YouTube" && (video.type === "Trailer" || video.type === "Teaser")) {
              videosMapeados.push({
                title: String(video.name || "Tráiler Oficial"),
                url: "https://youtube.com" + video.key,
                mime: "video/mp4"
              });
            }
          }
        }

        // Devolvemos el objeto maestro estructurado para inyectar la interfaz premium
        return [{
          id: "tmdb:" + kind + "-" + idLimpio,
          ref: kind + "|" + idLimpio,
          title: String(movieData.title || movieData.name || query.q),
          kind: kind,
          year: movieData.release_date || movieData.first_air_date ? String(movieData.release_date || movieData.first_air_date).substring(0, 4) : undefined,
          overview: movieData.overview ? String(movieData.overview) : undefined,
          poster: movieData.poster_path ? (TMDB_IMAGE_BASE + movieData.poster_path) : undefined,
          backdrop: movieData.backdrop_path ? (TMDB_IMAGE_BASE + movieData.backdrop_path) : undefined,
          cast: elencoMapeado, // Fotos redondas inyectadas
          videos: videosMapeados, // Fila de tráilers oficiales activa
          ids: { tmdb: parseInt(idLimpio, 10) }
        }];
      }
    } catch (e) {
      kino.log("Error armando metadatos enriquecidos:", e.message);
    }

    // Retorno de respaldo básico si la llamada extendida falla
    return [{
      id: `tmdb:${kind}-${idLimpio}`,
      ref: `${kind}|${idLimpio}`,
      title: query.q || "Contenido",
      kind: kind,
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: parseInt(idLimpio, 10) }
    }];
  }

  // BÚSQUEDA GLOBAL MULTI-CATÁLOGO
  var urlSearch = "https://themoviedb.org/search/movie?query=" + encodeURIComponent(query.q) + "&language=es-MX&api_key=" + TMDB_API_KEY;
  try {
    var searchRes = await kino.fetch(urlSearch);
    if (searchRes && searchRes.ok) {
      var searchData = searchRes.json();
      var resultados = searchData.results || [];
      
      var itemsMapeados = [];
      for (var i = 0; i < resultados.length; i++) {
        var pelicula = resultados[i];
        itemsMapeados.push({
          id: "tmdb:movie-" + pelicula.id,
          ref: "movie|" + pelicula.id,
          title: String(pelicula.title),
          kind: "movie",
          year: pelicula.release_date ? pelicula.release_date.substring(0, 4) : undefined,
          poster: pelicula.poster_path ? (TMDB_IMAGE_BASE + pelicula.poster_path) : undefined,
          backdrop: pelicula.backdrop_path ? (TMDB_IMAGE_BASE + pelicula.backdrop_path) : undefined,
          overview: pelicula.overview ? String(pelicula.overview) : undefined,
          ids: { tmdb: pelicula.id }
        });
      }
      return itemsMapeados;
    }
  } catch (err) {
    return [];
  }

  return [];
}

/**
 * 2. CAPACIDAD DE DESGLOSE DE EPISODIOS (episodes)
 * Tu lógica de capítulos optimizada en base a promesas planas
 */
export async function episodes(ref) {
  await null;
  var parts = ref.split("|");
  var tmdbId = parts[1];
  
  var urlEpisodes = "https://themoviedb.org/tv/" + tmdbId + "?language=es-MX&api_key=" + TMDB_API_KEY;
  
  try {
    var res = await kino.fetch(urlEpisodes);
    if (res && res.ok) {
      var seriesData = res.json();
      var episodesList = [];
      var seasons = seriesData.seasons || [];
      
      for (var s = 0; s < seasons.length; s++) {
        if (seasons[s].season_number === 0) continue;
        var sNum = seasons[s].season_number;
        for (var e = 1; e <= (seasons[s].episode_count || 0); e++) {
          episodesList.push({
            season: sNum,
            number: e,
            ref: "series|" + tmdbId + "|" + sNum + "|" + e,
            title: "T" + sNum + " - Episodio " + e + " (Espejo de respaldo)"
          });
        }
      }
      return {
        series: { title: String(seriesData.name), overview: String(seriesData.overview) },
        episodes: episodesList
      };
    }
  } catch (err) {
    return { series: { title: "Película" }, episodes: [] };
  }
  return { series: { title: "Película" }, episodes: [] };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN MULTIMEDIA (resolve)
 * Enrutamiento corregido al servidor de video estable libre de Iframe
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
    if (parts.length >= 4) {
      var seasonNum = parts[2];
      var episodeNum = parts[3];
      urlFinal = "https://vidsrc.to" + tmdbId + "/" + seasonNum + "/" + episodeNum;
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
