/// <reference path="./kino.d.ts" />

/**
 * TMDB Player Multi-Server para Kino TV
 * Arquitectura Dinámica Multi-Mirror - API v6 Compatible
 * Desarrollado por CISBO92 y Colaborador AI (2026)
 */

export function search(query) {
  if (!query || (!query.q && !query.tmdbId)) {
    return { items: [] };
  }

  // Si Kino ya nos provee el ID de TMDB directamente, saltamos la búsqueda y resolvemos el item inmediato
  if (query.tmdbId) {
    var idPlano = parseInt(query.tmdbId, 10);
    var textoTitulo = query.q ? String(query.q) : "Contenido Vinculado";
    var anoLimpio = query.year ? String(query.year) : "2026";
    var tipoContenido = query.kind === "series" ? "series" : "movie";

    return {
      items: [{
        id: "tmdb-player-para-kino:" + tipoContenido + "-" + idPlano,
        ref: tipoContenido + "-" + idPlano,
        title: textoTitulo,
        kind: tipoContenido,
        year: anoLimpio,
        ids: { tmdb: idPlano }
      }]
    };
  }

  // Si es una búsqueda por texto del usuario, consultamos el catálogo espejo de 2Embed
  var keyword = encodeURIComponent(query.q);
  var esSeries = query.kind === "series";
  var endpoint = esSeries 
    ? "https://2embed.cc" + keyword
    : "https://2embed.cc" + keyword;

  try {
    // Realizamos la petición al servidor puente de metadatos
    var respuesta = fetch(endpoint);
    if (!respuesta || respuesta.status !== 200) {
      return { items: [] };
    }

    var datos = JSON.parse(respuesta.body);
    if (!datos || !datos.results || datos.results.length === 0) {
      return { items: [] };
    }

    // Mapeamos los resultados del servidor al formato estándar de Kino
    var itemsFormateados = datos.results.map(function(item) {
      var idTMDB = item.id;
      var titulo = item.title || item.name || "Título Desconocido";
      var fecha = item.release_date || item.first_air_date || "";
      var ano = fecha ? fecha.split("-")[0] : "----";
      var tipo = esSeries ? "series" : "movie";

      return {
        id: "tmdb-player-para-kino:" + tipo + "-" + idTMDB,
        ref: tipo + "-" + idTMDB,
        title: titulo,
        kind: tipo,
        year: ano,
        ids: { tmdb: idTMDB }
      };
    });

    return { items: itemsFormateados };

  } catch (error) {
    // Selector de contingencia en caso de fallo de red en la API espejo
    return { items: [] };
  }
}

export function resolve(ref, episodeId = null) {
  if (!ref) {
    return { url: "" };
  }

  var isSeries = String(ref).includes("series-");
  var idLimpio = String(ref).replace("movie-", "").replace("series-", "").trim();
  
  var urlVidSrc = "";
  var urlVidLink = "";
  var url2Embed = "";

  if (isSeries) {
    var seasonNumber = 1;
    var episodeNumber = 1;

    if (episodeId) {
      if (typeof episodeId === "object") {
        seasonNumber = episodeId.season !== undefined ? parseInt(episodeId.season, 10) : 1;
        episodeNumber = episodeId.number !== undefined ? parseInt(episodeId.number, 10) : 1;
      } else if (typeof episodeId === "string" && episodeId.toLowerCase().includes("e")) {
        var strId = episodeId.toLowerCase();
        var matchSeason = strId.match(/s(\d+)/);
        var matchEpisode = strId.match(/e(\d+)/);
        if (matchSeason) seasonNumber = parseInt(matchSeason[1], 10);
        if (matchEpisode) episodeNumber = parseInt(matchEpisode, 10);
      } else {
        episodeNumber = parseInt(episodeId, 10) || 1;
      }
    }
    
    urlVidLink = "https://vidlink.pro" + idLimpio + "/" + seasonNumber + "/" + episodeNumber;
    urlVidSrc  = "https://vidsrc.to" + idLimpio + "/" + seasonNumber + "/" + episodeNumber;
    url2Embed  = "https://2embed.cc" + idLimpio + "&s=" + seasonNumber + "&e=" + episodeNumber;
    
  } else {
    urlVidLink = "https://vidlink.pro" + idLimpio;
    urlVidSrc  = "https://vidsrc.to" + idLimpio;
    url2Embed  = "https://2embed.cc" + idLimpio;
  }

  var defaultUA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

  return {
    url: urlVidLink, 
    expiresInSeconds: 3600,
    headers: {
      "User-Agent": defaultUA,
      "Referer": "https://vidlink.pro"
    },
    mirrors: [
      {
        name: "VidLink (HD - Auto Cap)",
        url: urlVidLink,
        headers: { "User-Agent": defaultUA, "Referer": "https://vidlink.pro" }
      },
      {
        name: "VidSrc (Auto Cap)",
        url: urlVidSrc,
        headers: { "User-Agent": defaultUA, "Referer": "https://vidsrc.to" }
      },
      {
        name: "2Embed (Alternativo)",
        url: url2Embed,
        headers: { "User-Agent": defaultUA, "Referer": "https://2embed.cc" }
      }
    ]
  };
}
