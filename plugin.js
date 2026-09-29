/// <reference path="./kino.d.ts" />

var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_IMAGE = "https://tmdb.org";
var API_KEY = "e21fc412c324d60a57c7164fd063fcde";

// Mapeador estricto optimizado para el motor en desarrollo
function mapTmdbItem(x, forcedKind) {
  if (!x || !x.id) return null;
  var rawId = parseInt(x.id, 10);
  var kind = forcedKind || "movie";
  
  var releaseYear = undefined;
  var dateStr = x.release_date || x.first_air_date;
  if (dateStr && String(dateStr).length >= 4) {
    releaseYear = String(dateStr).substring(0, 4);
  }

  return {
    id: "tmdb-player-multi:" + kind + "-" + rawId,
    ref: kind + "-" + rawId,
    title: String(x.title || x.name || "Sin título"),
    kind: kind,
    year: releaseYear,
    poster: x.poster_path ? (TMDB_IMAGE + x.poster_path) : undefined,
    backdrop: x.backdrop_path ? (TMDB_IMAGE + x.backdrop_path) : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES EXPUESTAS DE FORMA DIRECTA ---

export async function search(query) {
  var endpoint = "/search/movie";
  var currentKind = "movie";
  
  if (query.type === "series" || query.type === "tv") {
    endpoint = "/search/tv";
    currentKind = "series";
  }
  
  var url = TMDB_API + endpoint + "?query=" + encodeURIComponent(query.q) + "&api_key=" + API_KEY + "&language=es-ES";
  
  // Retorno directo sin almacenamiento intermedio para romper el bucle de las alertas de red
  return kino.fetch(url, { timeoutMs: 10000 })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data || !data.results) return { items: [] };
      var mapped = [];
      for (var i = 0; i < data.results.length; i++) {
        var item = mapTmdbItem(data.results[i], currentKind);
        if (item) mapped.push(item);
      }
      return { items: mapped };
    })
    .catch(function() { return { items: [] }; });
}

export async function episodes(ref) {
  var id = ref.replace("series-", "").replace("tv-", "");
  var url = TMDB_API + "/tv/" + id + "?api_key=" + API_KEY + "&language=es-ES";
  
  return kino.fetch(url, { timeoutMs: 10000 })
    .then(function(r) { return r.json(); })
    .then(function(seriesData) {
      var episodesList = [];
      var seasons = seriesData.seasons || [];
      
      for (var s = 0; s < seasons.length; s++) {
        if (seasons[s].season_number === 0) continue;
        var sNum = seasons[s].season_number;
        for (var e = 1; e <= (seasons[s].episode_count || 0); e++) {
          episodesList.push({
            season: sNum,
            number: e,
            ref: "tv-" + id + "-" + sNum + "-" + e,
            title: "Episodio " + e + " (Servidor TMDB)"
          });
        }
      }
      return {
        series: { title: seriesData.name, overview: seriesData.overview },
        episodes: episodesList
      };
    });
}

export async function resolve(ref) {
  var videoUrl = "";
  if (ref.indexOf("tv-") === 0) {
    var parts = ref.split("-");
    videoUrl = "https://vidsrc.pm" + parts[1] + "/" + parts[2] + "/" + parts[3];
  } else {
    var cleanId = ref.replace("movie-", "");
    videoUrl = "https://vidsrc.pm" + cleanId;
  }
  
  return {
    url: videoUrl,
    expiresInSeconds: 3600
  };
}
