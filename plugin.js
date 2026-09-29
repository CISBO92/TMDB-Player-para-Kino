/**
 * Simulación de los parámetros de conexión que usa una app estilo Xuper.
 * En un plugin real avanzado, estos datos se le piden al usuario en una pantalla de Ajustes.
 */
const CONFIG_SERVIDOR = {
  dns: "https://ejemplo-servidor-iptv.com",
  usuario: "prueba_kino",
  contrasenia: "kino2026"
};

export async function search(query) {
  await null; // Evita el Rejection Trap inicial
  if (!query.q && !query.tmdbId) return [];

  // Usamos TMDB para pintar la interfaz bonita dentro de Kino
  const urlTMDB = `https://themoviedb.org{encodeURIComponent(query.q)}&language=es-MX`;
  
  try {
    const res = await kino.fetch(urlTMDB);
    if (res && res.ok) {
      const data = res.json();
      return (data.results || []).map(pelicula => ({
        id: `xtream-${pelicula.id}`,
        ref: `movie|${pelicula.id}`,
        title: pelicula.title,
        kind: "movie",
        year: pelicula.release_date ? pelicula.release_date.split("-")[0] : undefined,
        ids: { tmdb: pelicula.id }
      }));
    }
  } catch (err) {
    return [];
  }
  return [];
}

export async function resolve(ref) {
  await null;
  const [kind, idPelicula] = ref.split("|");

  // REGLA DE ORO DE XUPER/IPTV: El enlace final de video se construye de forma directa
  // uniendo el DNS, el usuario, la contraseña y el ID del archivo de video (.mp4 o .mkv)
  const urlVideoDirecto = `${CONFIG_SERVIDOR.dns}/movie/${CONFIG_SERVIDOR.usuario}/${CONFIG_SERVIDOR.contrasenia}/${idPelicula}.mp4`;

  return {
    url: urlVideoDirecto,
    mime: "video/mp4",
    headers: {
      "User-Agent": "IPTVSmarters/1.0" // Simulamos un reproductor de IPTV estándar para evitar bloqueos
    }
  };
}
