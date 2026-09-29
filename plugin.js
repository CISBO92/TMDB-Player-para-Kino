/**
 * Base de datos interna de tus enlaces de video directos.
 * Tu estructura original intacta.
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

// Declaración estricta inmutable para evitar redefiniciones en QuickJS
const TMDB_IMAGE_BASE = "https://tmdb.org";
const TMDB_API_KEY = "e21fc412c324d60a57c7164fd063fcde";

/**
 * 1. CAPACIDAD DE BÚSQUEDA Y ENRIQUECIMIENTO (search)
 * Diseñada para inyectar Elenco, Sinopsis y Tráilers nativos de forma segura.
 */
export async function search(query) {
  await null; 

  if (!query.q && !query.tmdbId) return [];

  // SI KINO SOLICITA LOS METADATOS DE UNA FICHA VINCULADA
  if (query.tmdbId) {
    const idLimpio = String(query.tmdbId).replace("movie-", "").replace("series-", "");
    const kind = query.kind || "movie";
    const endpoint = (kind === "series") ? "/tv/" : "/movie/";
    
    const urlDetalles = "https://themoviedb.org" + endpoint + idLimpio + "?language=es-MX&api_key=" + TMDB_API_KEY + "&append_to_response=credits,videos";
    
    try {
      const res = await kino.fetch(urlDetalles);
      if (res && res.ok) {
        const movieData = res.json();
        
        // 1. Mapeamos el Elenco (Fotos redondas de actores)
        const elencoMapeado = [];
        if (movieData.credits && movieData.credits.cast) {
          const castLimit = Math.min(movieData.credits.cast.length, 12);
          for (var c = 0; c < castLimit; c++) {
            var actor = movieData.credits.cast[c];
            elencoMapeado.push({
              name: String(actor.name),
              character: String(actor.character || "Actor"),
              image: actor.profile_path ? (TMDB_IMAGE_BASE + actor.profile_path) : undefined
            });
          }
        }

        // 2. Mapeamos los Videos (Tráilers Oficiales)
        const videosMapeados = [];
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

        return [{
          id: "tmdb:" + kind + "-" + idLimpio,
          ref: kind + "|" + idLimpio,
          title: String(movieData.title || movieData.name || query.q),
          kind: kind,
          year: (movieData.release_date || movieData.first_air_date) ? String(movieData.release_date || movieData.first_air_date).substring(0, 4) : undefined,
          overview: movieData.overview ? String(movieData.overview) : undefined,
          poster: movieData.poster_path ? (TMDB_IMAGE_BASE + movieData.poster_path) : undefined,
          backdrop: movieData.backdrop_path ? (TMDB_IMAGE_BASE + movieData.backdrop_path) : undefined,
          cast: elencoMapeado,
          videos: videosMapeados,
          ids: { tmdb: parseInt(idLimpio, 10) }
        }];
      }
    } catch (e) {
      kino.log("Error armando metadatos enriquecidos:", e.message);
    }

    return [{
      id: "tmdb:" + kind + "-" + idLimpio,
      ref: kind + "|" + idLimpio,
      title: query.q || "Contenido",
      kind: kind,
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: parseInt(idLimpio, 10) }
    }];
  }

  // BÚSQUEDA GLOBAL MULTI-CATÁLOGO
  const urlSearch = "https://themoviedb.org/search/movie?query=" + encodeURIComponent(query.q) + "&language=es-MX&api_key=" + TMDB_API_KEY;
  try {
    const searchRes = await kino.fetch(urlSearch);
    if (searchRes && searchRes.ok) {
      const searchData = searchRes.json();
      const resultados = searchData.results || [];
      
      const itemsMapeados = [];
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
 */
export async function episodes(ref) {
  await null;
  const parts = ref.split("|");
  const tmdbId = parts[1];
  
  const urlEpisodes = "https://themoviedb.org/tv/" + tmdbId + "?language=es-MX&api_key=" + TMDB_API_KEY;
  
  try {
    const res = await kino.fetch(urlEpisodes);
    if (res && res.ok) {
      const seriesData = res.json();
      const episodesList = [];
      const seasons = seriesData.seasons || [];
      
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
