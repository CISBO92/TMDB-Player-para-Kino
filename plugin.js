/// <reference path="./kino.d.ts" />

var TMDB_API = "https://themoviedb.org";
var TMDB_IMAGE = "https://tmdb.org";
var API_KEY = "e21fc412c324d60a57c7164fd063fcde"; 

// Mapeador nativo plano sin ES6
function mapTmdbItem(x) {
  if (!x || !x.id) return null;
  var rawId = parseInt(x.id, 10);
  if (isNaN(rawId)) return null;

  return {
    id: "tmdb-player:movie-" + rawId,
    ref: String(rawId),
    title: String(x.title || x.name || "Sin título"),
    kind: "movie",
    year: x.release_date ? String(x.release_date).substring(0, 4) : undefined,
    poster: x.poster_path ? (TMDB_IMAGE + x.poster_path) : undefined,
    backdrop: x.backdrop_path ? (TMDB_IMAGE + x.backdrop_path) : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES CON PROMESAS PURAS (SIN ASYNC/AWAIT) ---

export function search(query) {
  var url = TMDB_API + "/search/movie?query=" + encodeURIComponent(query.q) + "&api_key=" + API_KEY + "&language=es-ES";
  
  // Usamos el retorno de promesa en bruto directo para evitar que el puente de Java sufra retardos
  return kino.fetch(url, { timeoutMs: 8000 })
    .then(function(r) {
      if (!r.ok) return { items: [] };
      return r.json();
    })
    .then(function(data) {
      if (!data || !data.results) return { items: [] };
      
      var mappedItems = [];
      for (var i = 0; i < data.results.length; i++) {
        var item = mapTmdbItem(data.results[i]);
        if (item !== null) {
          mappedItems.push(item);
        }
      }
      return { items: mappedItems };
    })
    .catch(function() {
      return { items: [] };
    });
}

export function resolve(ref) {
  // Retorno inmediato síncrono envuelto en promesa limpia para no congelar el motor QuickJS
  return Promise.resolve().then(function() {
    var cleanId = String(ref).replace("movie-", "").trim();
    return {
      url: "https://vidsrc.to" + cleanId,
      expiresInSeconds: 3600
    };
  });
}
