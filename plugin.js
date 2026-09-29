/// <reference path="./kino.d.ts" />

// 1. CAPACIDAD DE BÚSQUEDA SÍNCRONA DIRECTA
export function search(query) {
  if (!query || (!query.q && !query.tmdbId)) {
    return { items: [] };
  }

  // Extraemos el identificador numérico enviado por Kino de forma segura
  var idPlano = query.tmdbId ? parseInt(query.tmdbId, 10) : 110; 
  if (isNaN(idPlano)) {
    idPlano = 110;
  }

  var textoTitulo = query.q ? String(query.q) : "Contenido Vinculado";
  var anoLimpio = query.year ? String(query.year) : "2026";

  // Formato estricto requerido por el puente de la app
  return {
    items: [{
      id: "tmdb-player-multi:movie-" + idPlano,
      ref: String(idPlano),
      title: textoTitulo,
      kind: "movie",
      year: anoLimpio,
      ids: { tmdb: idPlano }
    }]
  };
}

// 2. CONTRATO DE RESOLUCIÓN MULTIMEDIA DIRECTA (resolve)
// Responde de forma instantánea al reproductor nativo evitando cuelgues de red en Java
export function resolve(ref) {
  if (!ref) {
    return { url: "" };
  }

  var idLimpio = String(ref).replace("movie-", "").replace("series-", "").trim();
  var urlStreaming = "https://vidsrc.to" + idLimpio;

  return {
    url: urlStreaming,
    expiresInSeconds: 3600,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
    }
  };
}
