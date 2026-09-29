/// <reference path="./kino.d.ts" />

var TMDB_API = "https://themoviedb.org";
var TMDB_IMAGE = "https://tmdb.org";
var API_KEY = "e21fc412c324d60a57c7164fd063fcde";

// Función de solicitud de red estable compatible con QuickJS
function fetchTmdb(path) {
  var connector = path.indexOf("?") !== -1 ? "&" : "?";
  var url = TMDB_API + path + connector + "api_key=" + API_KEY + "&language=es-ES";
  return kino.fetch(url, { timeoutMs: 10000 })
    .then(function(r) { return r.json(); });
}

// Mapeador oficial con el prefijo exacto de nuestro ID
function mapTmdbItem(x, forcedKind) {
  if (!x || !x.id) return null;
  var rawId = parseInt(x.id, 10);
  var kind = forcedKind || ((x.media_type === "tv" || x.first_air_date) ? "series" : "movie");
  
  return {
    id: "tmdb-player-multi:" + kind + "-" + rawId,
    ref: kind + "-" + rawId,
    title: String(x.title || x.name || "Sin título"),
    kind: kind,
    year: x.release_date || x.first_air_date ? String(x.release_date || x.first_air_date).substring(0, 4) : undefined,
    poster: x.poster_path ? (TMDB_IMAGE + x.poster_path) : undefined,
    backdrop: x.backdrop_path ? (TMDB_IMAGE + x.backdrop_path) : undefined,
    overview: x.overview ? String(x.overview) : undefined
  };
}

// --- CAPABILITIES EXPORTADAS NATIVAMENTE ---

export async function search(query) {
  var endpoint = query.type === "series" ? "/search/tv" : "/search/movie";
  return fetchTmdb(endpoint + "?query=" + encodeURIComponent(query.q))
    .then(function(data) {
      if (!data || !data.results) return { items: [] };
      var mapped = [];
      for (var i = 0; i < data.results.length; i++) {
        var item = mapTmdbItem(data.results[i], query.type);
        if (item) mapped.push(item);
      }
      return { items: mapped };
    }).catch(function() { return { items: [] }; });
}

export async function episodes(ref) {
  var id = ref.replace("series-", "");
  return fetchTmdb("/tv/" + id)
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
  
  // Procesamiento seguro de texto plano libre de cierres inesperados
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
