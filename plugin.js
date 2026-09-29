/**
 * Base de datos interna de tus enlaces de video directos.
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
 * Envia el objeto limpio estructurado. Kino TV se encargará de rellenar el elenco 
 * y las fotos redondas en base a la propiedad 'ids: { tmdb: ... }'.
 */
export async function search(query) {
  await null; 

  if (!query.q && !query.tmdbId) return [];

  const keyApi = "e21fc412c324d60a57c7164fd063fcde";

  if (query.tmdbId) {
    const cleanId = parseInt(String(query.tmdbId).replace("movie-", "").replace("series-", ""), 10);
    const itemKind = query.kind || "movie";
    
    return [{
      id: "tmdb-player-multi:" + itemKind + "-" + cleanId,
      ref: itemKind + "|" + cleanId,
      title: query.q || "Contenido Vinculado",
      kind: itemKind,
      year: query.year ? String(query.year) : undefined,
      ids: { tmdb: cleanId }
    }];
  }

  const urlTMDB = "https://themoviedb.org" + encodeURIComponent(query.q) + "&language=es-MX&api_key=" + keyApi;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      const resultados = data.results || [];
      const imgBase = "https://tmdb.org";
      
      const mapped = [];
      for (var i = 0; i < resultados.length; i++) {
        var pelicula = resultados[i];
        var idNum = parseInt(pelicula.id, 10);
        
        mapped.push({
          id: "tmdb-player-multi:movie-" + idNum,
          ref: "movie|" + idNum,
          title: String(pelicula.title),
          kind: "movie",
          year: pelicula.release_date ? String(pelicula.release_date).substring(0, 4) : undefined,
          poster: pelicula.poster_path ? (imgBase + pelicula.poster_path) : undefined,
          backdrop: pelicula.backdrop_path ? (imgBase + pelicula.backdrop_path) : undefined,
          overview: pelicula.overview ? String(platica.overview) : "",
          ids: { tmdb: idNum }
        });
      }
      return mapped;
    }
  } catch (err) {
    return [];
  }

  return [];
}

/**
 * 2. CAPACIDAD DE DESGLOSE DE EPISODIOS (episodes)
 * Tu lógica original que mapeaba perfectamente la interfaz de los capítulos.
 */
export async function episodes(ref) {
  await null;
  const parts = ref.split("|");
  const tmdbId = parseInt(parts, 10);
  const keyApi = "e21fc412c324d60a57c7164fd063fcde";
  
  const urlEpisodes = "https://themoviedb.org" + tmdbId + "?language=es-MX&api_key=" + keyApi;
  
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
            title: "Episodio " + e + " (Servidor TMDB)"
          });
        }
      }
      return {
        series: { title: String(seriesData.name), overview: String(seriesData.overview) },
        episodes: episodesList
      };
    }
  } catch (err) {
    return { series: { title: "Contenido" }, episodes: [] };
  }
  return { series: { title: "Contenido" }, episodes: [] };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN MULTIMEDIA (resolve)
 * Conecta de forma directa al streaming final de vidsrc.to
 */
export async function resolve(ref) {
  await null; 
  
  const parts = ref.split("|");
  const kind = parts;
  const tmdbId = parts;
  
  var urlFinal = "";
  var mimeFinal = "video/mp4";

  if (MIS_VIDEOS[tmdbId]) {
    urlFinal = MIS_VIDEOS[tmdbId].url;
    mimeFinal = MIS_VIDEOS[tmdbId].mime;
  } else {
    if (parts.length >= 4) {
      var seasonNum = parts;
      var episodeNum = parts;
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
