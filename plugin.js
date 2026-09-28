/**
 * Constantes de los proveedores de Streaming estables
 */
const SERVIDORES = {
  vidsrc_to: "https://vidsrc.to/embed",
  vidsrc_me: "https://vidsrcme.ru",
  vidlink:   "https://vidlink.pro",
  embed_2:   "https://2embed.cc"
};

/**
 * 1. CAPACIDAD DE BÚSQUEDA (search)
 * Recibe los metadatos de Kino (como query de texto e IDs de TMDB).
 * Retorna una lista estructurada compatible con las fichas internas de Kino.
 */
export async function search(query) {
  // Evitamos la trampa de rechazo inicial de QuickJS
  await null;

  if (!query.q && !query.tmdbId) return [];

  // Mapeamos los datos simulando la respuesta de catálogo para que Kino genere la interfaz
  const idEstable = query.tmdbId ? `tmdb-${query.tmdbId}` : `q-${encodeURIComponent(query.q)}`;
  
  // Guardamos los datos clave de la obra dentro del parámetro "ref" (opaco para Kino, transparente para resolve)
  const tipoContenido = query.type === "series" ? "series" : "movie";
  const referenciaInterna = `${tipoContenido}|${query.tmdbId || 0}|${encodeURIComponent(query.q)}|${query.year || 0}`;

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
 * 2. CAPACIDAD DE RESOLUCIÓN (resolve)
 * Recibe el parámetro "ref" guardado previamente y decide las rutas de streaming del reproductor nativo.
 * Maneja automáticamente películas y enrutamiento básico para episodios.
 */
export async function resolve(ref) {
  // Primer paso asíncrono obligatorio según la guía técnica
  await null;

  // Desestructuramos la referencia guardada en el buscador
  const [kind, tmdbId, queryText, year] = ref.split("|");
  
  if (!tmdbId || tmdbId === "0") {
    // Si no cuenta con ID numérico de TMDB, lanzamos un error tipificado que Kino entiende perfectamente
    throw kino.error("not_found", "Falta el identificador TMDB para enlazar los servidores.");
  }

  // Por defecto, Kino procesará la reproducción a través del clúster principal estable.
  // Los reproductores de Kino leen los manifiestos multimedia de los hosts permitidos.
  let targetUrl = "";

  if (kind === "movie") {
    // Ruta limpia para películas usando el ID TMDB oficial
    targetUrl = `${SERVIDORES.vidsrc_to}/movie/${tmdbId}`;
  } else {
    // Si es una serie (TV Show), enlazamos al primer episodio por defecto.
    // *Nota: Kino llamará de forma interna a este resolvedor.
    targetUrl = `${SERVIDORES.vidsrc_to}/tv/${tmdbId}/1/1`;
  }

  // Retornamos el contrato exacto de objeto Stream que exige Kino
  return {
    url: targetUrl,
    mime: "application/x-mpegURL", // Formato HLS nativo compatible con el reproductor interno
    expiresInSeconds: 7200,         // El enlace se refrescará automáticamente si expira en 2 horas
    headers: {
      "User-Agent": `KinoApp/${kino.appVersion} (TMDB-Player-Integrated)`
    }
  };
}
