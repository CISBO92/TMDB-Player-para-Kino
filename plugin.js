const SERVIDORES = {
  vidsrc_to: "https://vidsrc.to",
  vidlink:   "https://vidlink.pro"
};

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 */
export async function search(query) {
  await null; 
  if (!query.q && !query.tmdbId) return [];

  const idEstable = query.tmdbId ? `tmdb-${query.tmdbId}` : `q-${encodeURIComponent(query.q)}`;
  const tipoContenido = query.type === "series" ? "series" : "movie";
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
 */
export async function episodes(ref) {
  await null;
  const [kind, tmdbId, title] = ref.split("|");

  if (!tmdbId || tmdbId === "0") {
    throw kino.error("not_found", "No se pueden mapear episodios sin un ID de TMDB válido.");
  }

  const urlTMDB = `https://themoviedb.org{tmdbId}?api_key=844421298d794454c7d3d64d1349966f&language=es-MX`;
  const res = await kino.fetch(urlTMDB);
  
  let listaEpisodios = [];

  if (res.ok) {
    const datosSerie = res.json();
    const temporadas = datosSerie.seasons || [];

    for (const temp of temporadas) {
      if (temp.season_number === 0) continue; 
      
      for (let i = 1; i <= temp.episode_count; i++) {
        listaEpisodios.push({
          season: temp.season_number,
          number: i,
          ref: `tv|${tmdbId}|${temp.season_number}|${i}`,
          title: `Episodio ${i}`
        });
      }
    }
  } else {
    for (let i = 1; i <= 24; i++) {
      listaEpisodios.push({
        season: 1,
        number: i,
        ref: `tv|${tmdbId}|1|${i}`,
        title: `Episodio ${i}`
      });
    }
  }

  return { episodes: listaEpisodios };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN (resolve) - ¡CORREGIDA!
 */
export async function resolve(ref) {
  await null;
  const parts = ref.split("|");
  const kind = parts[0];
  const tmdbId = parts[1];

  let urlVideo = "";

  if (kind === "movie") {
    // Cambiamos a vidsrc_to que suele ser más directo para la extracción nativa
    urlVideo = `${SERVIDORES.vidsrc_to}/movie/${tmdbId}`;
  } else {
    const temporada = parts[2] || "1";
    const episodio = parts[3] || "1";
    urlVideo = `${SERVIDORES.vidsrc_to}/tv/${tmdbId}/${temporada}/${episodio}`;
  }

  return {
    url: urlVideo,
    // Eliminamos temporalmente la etiqueta rígida de subtítulos y el mime exacto 
    // para dejar que el reproductor nativo de Kino negocie el formato web directamente
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://vidsrc.to"
    }
  };
}
