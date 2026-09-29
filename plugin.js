/// <reference path="./kino.d.ts" />

// 1. CAPACIDAD DE BÚSQUEDA SÍNCRONA
// Eliminamos la red. Respondemos instantáneamente inyectando el contrato que la app espera.
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

  // Retornamos el objeto estructurado inmediatamente en texto plano
  return {
    items: [{
      id: "tmdb-player-multi:movie-" + idPlano,
      ref: String(idPlano),
      title: textoTitulo,
      kind: "movie",
      year: anoLimpio,
      ids: { tmdb: idPlano } // El núcleo de Java usará este ID para rellenar los actores automáticamente
    }]
  };
}

// 2. CAPACIDAD DE RESOLUCIÓN INSTANTÁNEA
// Genera la ruta directa al servidor multimedia compatible sin esperas asíncronas
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
