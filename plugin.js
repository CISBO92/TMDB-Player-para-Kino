/// <reference path="./kino.d.ts" />

/**
 * TMDB Player Multi-Server para Kino TV
 * Arquitectura Síncrona Dinámica Multi-Mirror (Código Limpio)
 * Desarrollado por CISBO92 (2026)
 */

// 1. CAPACIDAD DE BÚSQUEDA SÍNCRONA DIRECTA
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
      id: "com.cisbo92.tmdb-player-para-kino:" + tipoContenido + "-" + idPlano,
      ref: tipoContenido + "-" + idPlano,
      title: textoTitulo,
      kind: tipoContenido,
      year: anoLimpio,
      ids: { tmdb: idPlano }
    }]
  };
}

// 2. CONTRATO DE RESOLUCIÓN MULTI-SERVIDOR AUTOMATIZADO
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

    // Mapeo dinámico del episodio seleccionado en Kino TV
    if (episodeId) {
      if (typeof episodeId === "object") {
        seasonNumber = episodeId.season !== undefined ? episodeId.season : 1;
        episodeNumber = episodeId.number !== undefined ? episodeId.number : 1;
      } else if (typeof episodeId === "string" && episodeId.toLowerCase().includes("e")) {
        var partes = String(episodeId).toLowerCase().split("e");
        if (partes.length === 2) {
          seasonNumber = parseInt(partes[0].replace("s", ""), 10) || 1;
          episodeNumber = parseInt(partes[1], 10) || 1;
        }
      } else {
        episodeNumber = parseInt(episodeId, 10) || 1;
      }
    }
    
    // URLs limpias para series
    urlVidSrc  = "https://vidsrc.to" + idLimpio + "/" + seasonNumber + "/" + episodeNumber;
    urlVidLink = "https://vidlink.pro" + idLimpio + "/" + seasonNumber + "/" + episodeNumber;
    url2Embed  = "https://2embed.cc" + idLimpio + "&s=" + seasonNumber + "&e=" + episodeNumber;
    
  } else {
    // URLs limpias para películas
    urlVidSrc  = "https://vidsrc.to" + idLimpio;
    urlVidLink = "https://vidlink.pro" + idLimpio;
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
