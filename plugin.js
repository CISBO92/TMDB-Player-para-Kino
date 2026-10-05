/// <reference path="./kino.d.ts" />

/**
 * TMDB Player Multi-Server para Kino TV
 * Arquitectura Síncrona Dinámica Multi-Mirror - API v6 Compatible
 * Desarrollado por CISBO92 y Colaborador AI (2026)
 */

export function search(query) {
  if (!query || (!query.q && !query.tmdbId)) {
    return { items: [] };
  }

  var idPlano = query.tmdbId ? parseInt(query.tmdbId, 10) : 110; 
  if (isNaN(idPlano)) {
    idPlano = 110;
  }

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
        // Extrae patrones de texto estructurados tipo s1e5 o S01E02
        var matchSeason = strId.match(/s(\d+)/);
        var matchEpisode = strId.match(/e(\d+)/);
        if (matchSeason && matchSeason[1]) seasonNumber = parseInt(matchSeason[1], 10);
        if (matchEpisode && matchEpisode[1]) episodeNumber = parseInt(matchEpisode[1], 10);
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
