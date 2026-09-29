/// <reference path="./kino.d.ts" />

// --- CAPABILITY 1: BÚSQUEDA GLOBAL (search) ---
export async function search(query) {
  // Cortamos el hilo nativo aislando el entorno de JavaScript de forma inmediata
  await Promise.resolve();

  if (!query || !query.q) {
    return { items: [] };
  }

  // Variables aisladas dentro del entorno local de la función para evitar fugas en el Sandbox
  const apiEndpoint = "https://themoviedb.org";
  const apiKey = "e21fc412c324d60a57c7164fd063fcde";
  const imgBaseUrl = "https://tmdb.org";
  const fetchUrl = apiEndpoint + "?query=" + encodeURIComponent(query.q) + "&api_key=" + apiKey + "&language=es-MX";

  try {
    const response = await kino.fetch(fetchUrl, { timeoutMs: 10000 });
    if (!response || !response.ok) {
      return { items: [] };
    }

    const data = response.json();
    if (!data || !data.results) {
      return { items: [] };
    }

    const outputItems = [];
    for (var i = 0; i < data.results.length; i++) {
      var item = data.results[i];
      if (!item || !item.id) continue;

      var rawId = parseInt(item.id, 10);
      if (isNaN(rawId)) continue;

      var releaseYear = undefined;
      if (item.release_date && String(item.release_date).length >= 4) {
        releaseYear = String(item.release_date).substring(0, 4);
      }

      // Cumple estrictamente con el formato de contrato exigido por la guía de Kino
      outputItems.push({
        id: "tmdb-player-multi:movie-" + rawId,
        ref: "movie|" + rawId,
        title: String(item.title || "Sin título"),
        kind: "movie",
        year: releaseYear,
        poster: item.poster_path ? (imgBaseUrl + item.poster_path) : undefined,
        backdrop: item.backdrop_path ? (imgBaseUrl + item.backdrop_path) : undefined,
        overview: item.overview ? String(item.overview) : "",
        ids: { tmdb: rawId } // Inyección nativa para forzar el dibujo de actores/tráilers
      });
    }

    // RETORNO REQUERIDO POR LA GUÍA: Objeto contenedor con propiedad 'items'
    return { items: outputItems };

  } catch (error) {
    kino.log("Falla en search purificado:", error.message);
    return { items: [] };
  }
}

// --- CAPABILITY 2: DESGLOSE DE EPISODIOS (episodes) ---
export async function episodes(ref) {
  await Promise.resolve();

  if (!ref) {
    return { series: { title: "Contenido" }, episodes: [] };
  }

  // Parseo seguro de la referencia limpia
  const referenceParts = String(ref).split("|");
  const resourceId = referenceParts[1] || referenceParts[0];
  const cleanTmdbId = parseInt(resourceId.replace("movie-", "").replace("series-", ""), 10);

  if (isNaN(cleanTmdbId)) {
    return { series: { title: "Contenido" }, episodes: [] };
  }

  const apiEndpoint = "https://themoviedb.org" + cleanTmdbId;
  const apiKey = "e21fc412c324d60a57c7164fd063fcde";
  const fetchUrl = apiEndpoint + "?api_key=" + apiKey + "&language=es-MX";

  try {
    const response = await kino.fetch(fetchUrl, { timeoutMs: 10000 });
    if (!response || !response.ok) {
      return { series: { title: "Película" }, episodes: [] };
    }

    const seriesData = response.json();
    const outputEpisodes = [];
    const seasonsList = seriesData.seasons || [];

    for (var s = 0; s < seasonsList.length; s++) {
      var currentSeason = seasonsList[s];
      if (!currentSeason || currentSeason.season_number === 0) continue;

      var seasonNumber = parseInt(currentSeason.season_number, 10);
      var totalEpisodes = parseInt(currentSeason.episode_count, 10);

      if (isNaN(seasonNumber) || isNaN(totalEpisodes)) continue;

      for (var e = 1; e <= totalEpisodes; e++) {
        outputEpisodes.push({
          season: seasonNumber,
          number: e,
          ref: "series|" + cleanTmdbId + "|" + seasonNumber + "|" + e,
          title: "Temporada " + seasonNumber + " · Episodio " + e
        });
      }
    }

    // RETORNO REQUERIDO POR LA GUÍA: Objeto contenedor con metadatos de cabecera y listado
    return {
      series: {
        title: String(seriesData.name || "Serie"),
        overview: String(seriesData.overview || "")
      },
      episodes: outputEpisodes
    };

  } catch (error) {
    kino.log("Falla en episodes purificado:", error.message);
    return { series: { title: "Película" }, episodes: [] };
  }
}

// --- CAPABILITY 3: RESOLUCIÓN MULTIMEDIA (resolve) ---
export async function resolve(ref) {
  await Promise.resolve();

  if (!ref) {
    return { url: "" };
  }

  try {
    const cleanReference = String(ref).trim();
    const parts = cleanReference.split("|");
    const kind = parts[0];
    const tmdbId = parts[1];

    var streamUrl = "";

    // Si la referencia tiene 4 partes, es una estructura de capítulos de serie mapeada arriba
    if (parts.length >= 4) {
      var season = parts[2];
      var episode = parts[3];
      streamUrl = "https://vidsrc.to" + tmdbId + "/" + season + "/" + episode;
    } else {
      // Si no, es una película directa
      var movieCleanId = String(tmdbId || parts[0]).replace("movie-", "");
      streamUrl = "https://vidsrc.to" + movieCleanId;
    }

    // Retornamos el objeto Stream definitivo al reproductor nativo de Kino
    return {
      url: streamUrl,
      expiresInSeconds: 3600,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      }
    };

  } catch (error) {
    kino.log("Falla en resolve purificado:", error.message);
    return { url: "" };
  }
}
