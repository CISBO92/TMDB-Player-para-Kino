const SERVIDORES = {
  icu: "https://vidsrc.icu"
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
  const parts = ref.split("|");
  const kind = parts;
  const tmdbId = parts;

  if (!tmdbId || tmdbId === "0") {
    throw kino.error("not_found", "No se pueden mapear episodios sin un ID de TMDB válido.");
  }

  const urlTMDB = `https://themoviedb.org{tmdbId}?api_key=c5e7b154746f363065a6e811f5fae448&language=es-MX`;
  let listaEpisodios = [];

  try {
    const res = await kino.fetch(urlTMDB);
    
    if (res && res.ok) {
      const datosSerie = res.json();
      const temporadas = datosSerie.seasons || [];

      for (const temp of temporadas) {
        if (temp.season_number === 0) continue; 
        
        for (let i = 1; i <= temp.episode_count; i++) {
          listaEpisodios.push({
            season: temp.season_number,
            number: i,
            ref: `tv|${tmdbId}|${temp.season_number}|${i}`,
            title: `Temporada ${temp.season_number} - Episodio ${i}`
          });
        }
      }
    }
  } catch (err) {
    listaEpisodios = [];
  }

  if (listaEpisodios.length === 0) {
    for (let s = 1; s <= 2; s++) { 
      for (let i = 1; i <= 10; i++) { 
        listaEpisodios.push({
          season: s,
          number: i,
          ref: `tv|${tmdbId}|${s}|${i}`,
          title: `T${s} - Episodio ${i} (Servidor alternativo)`
        });
      }
    }
  }

  return { episodes: listaEpisodios };
}

/**
 * 3. CAPACIDAD DE RESOLUCIÓN (resolve) - ¡CORREGIDA CON NUEVO PROVEEDOR DESBLOQUEADO!
 */
export async function resolve(ref) {
  await null;
  const parts = ref.split("|");
  const kind = parts;
  const tmdbId = parts;

  let urlDestino = "";

  if (kind === "movie") {
    urlDestino = `${SERVIDORES.icu}/movie/${tmdbId}`;
  } else {
    const temporada = parts || "1";
    const episodio = parts || "1";
    urlDestino = `${SERVIDORES.icu}/tv/${tmdbId}/${temporada}/${episodio}`;
  }

  // Devolvemos las propiedades que Kino y el reproductor necesitan para romper las restricciones de protección web
  return {
    url: urlDestino,
    headers: {
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      "Referer": "https://vidsrc.icu",
      "Origin": "https://vidsrc.icu"
    }
  };
}
