const SERVIDORES = {
  vidsrc_to: "https://vidsrc.to",
  vidlink:   "https://vidlink.pro"
};

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 */
export async function search(query) {
  await null; // Evita el Rejection Trap de QuickJS
  if (!query.q && !query.tmdbId) return [];

  const idEstable = query.tmdbId ? `tmdb-${query.tmdbId}` : `q-${encodeURIComponent(query.q)}`;
  const tipoContenido = query.type === "series" ? "series" : "movie";
  
  // Guardamos los metadatos esenciales en el ref
  const referenciaInterna = `${tipoContenido}|${query.tmdbId || 0}|${encodeURIComponent(query.q)}`;

  return [{
    id: idEstable,
    ref: referenciaInterna,
    title: query.q || "Contenido Seleccionado",
    kind: tipoContenido,
    year: query.year ? String(query.year) : undefined,
    ids: query.tmdbId ? { tmdb: query.tmdbId } : undefined
  }];
}

/**
 * 2. CAPACIDAD DE EPISODIOS (episodes)
 * Si el contenido es una serie, Kino llama a esta función para armar la lista en pantalla.
 */
export async function episodes(ref) {
  await null;
  const [kind, tmdbId, title] = ref.split("|");

  if (!tmdbId || tmdbId === "0") {
    throw kino.error("not_found", "No se pueden mapear episodios sin un ID de TMDB válido.");
  }

  // Hacemos una petición rápida a la API pública de TMDB para saber cuántas temporadas y episodios tiene.
  // Nota: Usamos una petición limpia. Si el fetch falla, Kino usará un formateo estándar por defecto.
  const urlTMDB = `https://themoviedb.org{tmdbId}?api_key=844421298d794454c7d3d64d1349966f&language=es-MX`;
  const res = await kino.fetch(urlTMDB);
  
  let listaEpisodios = [];

  if (res.ok) {
    const datosSerie = res.json();
    const temporadas = datosSerie.seasons || [];

    // Recorremos las temporadas reales de la serie
    for (const temp of temporadas) {
      if (temp.season_number === 0) continue; // Ignoramos los especiales (capítulo 0)
      
      // Creamos los episodios simulados para cada temporada de forma masiva
      for (let i = 1; i <= temp.episode_count; i++) {
        listaEpisodios.push({
          season: temp.season_number,
          number: i,
          // Guardamos la ruta exacta del episodio en el ref: "tv|idTMDB|temporada|episodio"
          ref: `tv|${tmdbId}|${temp.season_number}|${i}`,
          title: `Episodio ${i}`
        });
      }
    }
  } else {
    // Plan de respaldo si TMDB no responde: Generamos una temporada estándar de 24 capítulos
    for (let i = 1; i <= 24; i++) {
      listaEpisodios.push({
        season: 1,
        number: i,
        ref: `tv|${tmdbId}|1|${i}`,
        title: `Episodio ${i}`
      });
    }
  }

  return {
    episodes: listaEpisodios
  };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN (resolve)
 * Genera la URL final del video y le inyecta los subtítulos en español e inglés.
 */
export async function resolve(ref) {
  await null;
  const parts = ref.split("|");
  const kind = parts[0];
  const tmdbId = parts[1];

  let urlVideo = "";

  if (kind === "movie") {
    // Película estándar
    urlVideo = `${SERVIDORES.vidlink}/movie/${tmdbId}`;
  } else {
    // Serie con temporada y episodio mapeados: "tv|idTMDB|temporada|episodio"
    const temporada = parts[2] || "1";
    const episodio = parts[3] || "1";
    urlVideo = `${SERVIDORES.vidlink}/tv/${tmdbId}/${temporada}/${episodio}`;
  }

  // Configuración de subtítulos automáticos
  // Los servidores modernos como VidLink permiten pasar parámetros de subtítulos en la URL,
  // pero Kino exige que se declaren en el objeto de retorno para controlarlos de forma nativa.
  const subtitulos = [
    {
      lang: "es",
      label: "Español",
      url: `${urlVideo}?sub.lang=es`, // El servidor espejo autodetecta y sirve el archivo .vtt/.srt
      format: "vtt"
    },
    {
      lang: "en",
      label: "English",
      url: `${urlVideo}?sub.lang=en`,
      format: "vtt"
    }
  ];

  return {
    url: urlVideo,
    mime: "application/x-mpegURL", // Formato de streaming HLS eficiente
    subtitles: subtitulos,
    expiresInSeconds: 7200,
    headers: {
      "User-Agent": `KinoApp/${kino.appVersion} (TMDB-Player-Integrated)`
    }
  };
}
