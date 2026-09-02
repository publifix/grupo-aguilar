# SEO técnico — Grupo Corporativo Aguilar

Documentación de la configuración SEO del sitio, implementada sobre el proyecto Astro
alojado en `publifix/grupo-aguilar` y publicado como **project site** de GitHub Pages en:

```
https://publifix.github.io/grupo-aguilar/
```

Esta nota resume qué se auditó, qué ya estaba bien hecho de rondas anteriores, qué se
corrigió o añadió en esta pasada, las decisiones tomadas (y por qué), y una checklist de
pasos manuales que quedan fuera del alcance de un cambio de código.

---

## 0. Arquitectura real del sitio (importante para leer el resto de este documento)

El sitio es una **landing page de una sola ruta** (`/`) con seis secciones ancladas por
`id` (Inicio, Nuestras Empresas, Perico, AGCA, Clientes, Contacto) más una segunda página
real, `/aviso-de-privacidad/`. **No existen URLs individuales** para `/perico`, `/agca`,
`/clientes` ni `/contacto`: son anclas (`#perico`, `#agca`, …) dentro del mismo documento
HTML.

Esto importa porque el pedido original habla de "metaetiquetas únicas por página" para
esas seis secciones — con la estructura actual eso no es técnicamente posible sin crear
páginas nuevas, porque una ancla no es una URL indexable por separado ni tiene su propio
`<head>`. Lo que sí se hizo, y es el equivalente correcto dado el diseño actual:

- Un único `title`/`description`/`keywords` de alta calidad para la home, que cubre las
  dos marcas y los servicios principales (ver §2).
- Cada sub-marca (Perico, AGCA) está representada como entidad propia dentro del
  `JSON-LD` de la organización, con su propio `@id`, URL ancla, logo y descripción
  (ver §5) — esto es lo que le da a Google señales estructuradas por sub-negocio sin
  necesitar URLs separadas.
- Encabezados `<h2>` por sección con su propio texto único, para que el contenido de
  cada bloque sea temáticamente identificable.

**Recomendación abierta (no implementada):** si a futuro el negocio quiere que Perico y
AGCA compitan por keywords propias en Google (ej. "ingeniería eléctrica Veracruz" vs.
"desarrollo inmobiliario Veracruz"), la mejora real es crear rutas dedicadas
(`/perico/`, `/agca/`) con su propio `<title>`/`description`/contenido ampliado. Es un
cambio de arquitectura de contenido, no una tarea de configuración, así que no se hizo
aquí sin que el cliente lo pida explícitamente.

---

## 1. Bug corregido: canonical y `og:url` perdían el base path

**Este es el hallazgo más importante de la auditoría.** Desde la primera implementación
de SEO del sitio, `src/layouts/Layout.astro` construía la URL canónica así:

```js
const canonicalUrl = new URL(Astro.url.pathname.replace(import.meta.env.BASE_URL, ""), siteUrl).toString();
```

En build, `import.meta.env.BASE_URL` vale `"/grupo-aguilar"` (sin slash final) y
`Astro.url.pathname` vale `"/grupo-aguilar/"` (con slash). El `.replace(...)` dejaba un
`"/"` suelto, y `new URL("/", "https://publifix.github.io/grupo-aguilar/")` resuelve a
**`https://publifix.github.io/`** — la raíz del dominio, no la ruta real del sitio, porque
una ruta absoluta (que empieza con `/`) descarta el subpath del segundo argumento de
`URL()`.

Esto significa que **todas** las etiquetas `<link rel="canonical">`, `og:url` y
`twitter:` que dependen de ella apuntaban a una URL que no existe
(`publifix.github.io/` está vacía; el sitio vive en `publifix.github.io/grupo-aguilar/`).
Un canonical apuntando a una página inexistente puede hacer que Google decida no indexar
la página real, o consolide señales en la URL equivocada.

**Corrección aplicada:** en vez de reconstruir el path a mano, se resuelve directamente
`Astro.url.pathname` (que ya incluye el base) contra el dominio raíz:

```js
const canonicalUrl = new URL(Astro.url.pathname, siteOrigin).toString();
```

Verificado en build:

| Página | Antes (roto) | Ahora |
|---|---|---|
| Home | `https://publifix.github.io/` | `https://publifix.github.io/grupo-aguilar/` |
| Aviso de privacidad | `https://publifix.github.io/` | `https://publifix.github.io/grupo-aguilar/aviso-de-privacidad/` |

Lo mismo corrige `og:url` y el `twitter:` card, que reutilizan la misma variable.

---

## 2. Metaetiquetas por página

`src/layouts/Layout.astro` ahora acepta `title`, `description`, `keywords`, `ogImage`,
`ogImageAlt` y `robots` como props, con valores por página:

| Página | Title | Robots |
|---|---|---|
| `/` (home) | `Grupo Corporativo Aguilar — Ingeniería Perico y AGCA \| Veracruz` | `index, follow` |
| `/aviso-de-privacidad/` | `Aviso de Privacidad — Grupo Corporativo Aguilar` | `noindex, follow` |

**Decisión:** se marcó el aviso de privacidad como `noindex, follow` (nuevo). Es una
página legal genérica y de contenido mínimo (el propio texto dice "es un aviso
provisional... debe ser revisado por el área legal"), y las páginas de este tipo
típicamente no aportan valor de búsqueda ni deberían competir por ranking — indexarlas
puede diluir la relevancia temática del dominio. `follow` se mantiene para que el enlace
"← Volver al inicio" siga transmitiendo equity normalmente. Si el cliente prefiere que
sí sea indexable, es un cambio de una línea (quitar el prop `robots` en
`aviso-de-privacidad.astro`).

`keywords` (meta tag, hoy con peso mínimo en Google pero aún usado por algunos motores y
herramientas de SEO/redes sociales) se agregó como prop con un valor por defecto
genérico y overrides específicos por página.

---

## 3. Canonical con base path de GitHub Pages

Ver §1 para la corrección. El mecanismo general (`base` desde `import.meta.env.BASE_URL`,
usado para prefijar cada `href`/`src` interno) ya estaba bien aplicado en todos los
componentes desde antes — el único punto roto era específicamente el cálculo de
`canonicalUrl`/`og:url` en el layout.

---

## 4. Open Graph y Twitter Cards

Ya existían y quedaron intactos, solo con la URL corregida (§1):

- `og:type`, `og:url`, `og:title`, `og:description`, `og:image` (+ `type`/`width`/
  `height`/`alt`), `og:locale=es_MX`, `og:site_name`.
- `twitter:card=summary_large_image`, `twitter:site`, `twitter:title`,
  `twitter:description`, `twitter:image`, `twitter:image:alt`.
- Imagen OG dedicada: `public/images/og-image.jpg`, 1200×630px (proporción correcta para
  Facebook/LinkedIn/Twitter), recortada de una foto real de proyecto.

El layout soporta pasar una imagen OG distinta por página vía el prop `ogImage`; hoy
ambas páginas usan la misma imagen general porque la de privacidad no necesita una
propia. Si en el futuro se crean páginas dedicadas para Perico/AGCA, cada una debería
recibir su propia imagen OG representativa.

---

## 5. Datos estructurados (JSON-LD)

Tipo raíz: **`GeneralContractor`** (que en la jerarquía de schema.org hereda de
`HomeAndConstructionBusiness` → `LocalBusiness` → `Organization`), en vez del genérico
`Organization` o `LocalBusiness` puro — es más específico y sigue satisfaciendo
cualquier validador que busque `LocalBusiness`/`Organization`, ya que Google reconoce
subtipos.

**Ya existía** (rondas anteriores): `name`, `alternateName`, `description`, `url`,
`logo`, `image`, `telephone`, `email`, `address` (Veracruz, CP 91900), `areaServed`,
`foundingDate`, `sameAs` (Facebook/X/Instagram/LinkedIn), `hasOfferCatalog` con 7
servicios.

**Agregado en esta ronda:**

- **`contactPoint`**: bloque `ContactPoint` explícito con teléfono, email, `contactType:
  "customer service"`, `areaServed: "MX"`, `availableLanguage: ["es"]` — mejora la
  elegibilidad para rich results de contacto.
- **`department` enriquecido**: Perico y AGCA ahora llevan `@id` propio, `logo` (su
  logotipo real: `logo-perico.png` / `agca.jpg`) y `parentOrganization` apuntando de
  vuelta al `@id` de la organización — antes solo tenían `name`/`description`/`url`. Esto
  las deja como sub-entidades correctamente enlazadas en el grafo de conocimiento, no
  solo texto suelto.

**Deliberadamente NO agregado** (para no fabricar datos):

- `geo` (coordenadas lat/long): no se inventaron. Deben salir del registro real en
  Google Business Profile (ver checklist §11).
- `openingHoursSpecification`: no hay horario confirmado en el contenido del sitio;
  publicar un horario incorrecto en datos estructurados es peor que omitirlo.
- `priceRange`: no aplica de forma significativa a un contratista B2B con presupuestos
  por proyecto.
- `AggregateRating`/`Review`: no existen reseñas reales que reportar; agregarlas sin
  reseñas verificables violaría las políticas de rich results de Google.

Verificar el bloque en producción con el
[Rich Results Test](https://search.google.com/test/rich-results) de Google una vez
desplegado (ver checklist).

---

## 6. Sitemap.xml y robots.txt

Ambos ya estaban correctamente configurados desde una ronda anterior y siguen
funcionando:

- `@astrojs/sitemap` genera `sitemap-index.xml` → `sitemap-0.xml` en el build, con las
  URLs completas y correctas (`https://publifix.github.io/grupo-aguilar/` y
  `.../aviso-de-privacidad/`), porque el `site`+`base` de `astro.config.mjs` ya estaban
  bien declarados — el sitemap nunca tuvo el bug de canonical de §1, que era un cálculo
  aparte solo dentro del layout.
- `public/robots.txt` permite todo (`Allow: /`) y apunta al sitemap con la URL completa
  correcta.

Verificado post-build en `dist/`:
```
dist/sitemap-index.xml → https://publifix.github.io/grupo-aguilar/sitemap-0.xml
dist/sitemap-0.xml     → /  y  /aviso-de-privacidad/
```

---

## 7. Jerarquía de encabezados

Auditoría completa de `src/`:

- **Un solo `<h1>` por página** — el de Hero.astro ("Grupo Corporativo Aguilar") en la
  home, el de `aviso-de-privacidad.astro` ("Aviso de Privacidad") en la otra. Correcto.
- Cada sección usa `<h2>` para su título principal (Statement, Companies, Perico ×3
  sub-bloques, AGCA, Clients, Contact) y `<h3>` para sub-elementos dentro de tarjetas
  (nombres de proyecto, títulos de servicio, pasos de la línea de tiempo). No hay saltos
  de nivel (h2 → h4 sin h3 de por medio).

No se requirieron cambios aquí; ya estaba bien estructurado.

---

## 8. Atributos `alt`

Auditoría de las 12 ubicaciones `<img>` del código (varias renderizan múltiples
imágenes vía `.map()`, así que en el HTML final son más de 60 imágenes individuales):
**el 100% ya tenía `alt` descriptivo**, no genérico ("logo" o vacío). Ejemplos:
`"Vista aérea del fraccionamiento Lagos de Puente Moreno de AGCA, con laguna y
albercas"`, `"Instalación eléctrica de media tensión ejecutada por Ingeniería Perico"`.

No se requirieron cambios; se dejó como estaba.

---

## 9. Rendimiento

### Lazy loading
Ya aplicado consistentemente: toda imagen fuera del viewport inicial usa
`loading="lazy"`; el hero (LCP) usa `loading="eager"` + `fetchpriority="high"` +
`srcset` responsive (900w para móvil, versión completa para desktop). Correcto tal
como estaba.

### Conversión a WebP (nuevo en esta ronda)

Se convirtieron las 17 fotografías de mayor peso — hero, las 6 tarjetas de "Experiencia
destacada", las 2 fotos de servicio de Perico, y las 7 fotos de AGCA (fondo de sección +
las 6 que la galería interactiva intercambia al hacer clic) — de JPEG a WebP (calidad
80), y se actualizaron todas las referencias en los componentes. Los `.jpg` originales
se eliminaron del repo por quedar huérfanos.

| Carpeta | Antes | Después | Ahorro |
|---|---|---|---|
| `hero/` | 590 KB | 396 KB | 33% |
| `proyectos/` (6 fotos) | 651 KB | 440 KB | 32% |
| `perico/` (2 fotos) | 653 KB | 517 KB | 21% |
| `agca/` (7 fotos) | 1,747 KB | 1,417 KB | 19% |
| **Total** | **~3.6 MB** | **~2.8 MB** | **~24%** |

**Se decidió NO convertir** (para no arriesgar regresiones en secciones ya
muy iteradas por pedidos específicos del cliente, y porque el impacto es marginal):
los 32 logotipos de clientes y los logos de empresas/certificaciones bajo
`clientes/`, `empresas/`, `certificaciones/` — son PNG pequeños (10–130 KB cada uno,
ya optimizados con flood-fill de transparencia en una ronda anterior), y su peso total
es bajo comparado con las fotografías. Sin `<picture>`/fallback: WebP tiene soporte
>96% global en navegadores modernos (todos los evergreen desde 2020), así que se sirve
directo sin capa de compatibilidad adicional — es la práctica estándar actual.

### Minificación CSS/JS
Ya cubierta automáticamente por el pipeline de build de Astro/Vite (minifica JS, purga
y minifica el CSS de Tailwind). No requiere configuración manual adicional.

### Fuentes
Ya usan `@fontsource` (self-hosted): cero requests a Google Fonts, cero bloqueo de
render por CDN externo. Correcto tal como estaba.

### CLS (layout shift)
Las imágenes de contenido ya renderizan dentro de contenedores con `aspect-[…]` de
Tailwind (que fija `aspect-ratio` en CSS) o alturas fijas, así que el espacio se reserva
antes de que la imagen cargue — no se agregaron atributos `width`/`height` nativos
adicionales porque, en los casos donde faltan, la imagen es `object-contain` dentro de
un contenedor de tamaño fijo (ej. logos), y forzar `width`/`height` con las dimensiones
intrínsecas del archivo sería inconsistente con el tamaño real de renderizado.

---

## 10. Enlazado interno

Ya existente: navbar (desktop + móvil) con los 6 anclas; CTAs cruzados en Hero
(→ Nuestras Empresas, → Contacto), Companies (cada tarjeta → su propia sección), AGCA
(→ Contacto).

**Agregado en esta ronda:** la sección Perico no tenía ningún CTA de cierre (a
diferencia de AGCA, que sí cierra con "Conoce más sobre AGCA →"). Se agregó
"Solicita tu proyecto con Ingeniería Perico →" enlazando a `#contacto`, con el mismo
estilo y comportamiento hover que el de AGCA, para que ambas secciones de negocio
tengan una salida de conversión consistente.

---

## 11. URLs limpias, idioma y PWA

- **URLs**: ya limpias (`/`, `/aviso-de-privacidad/`), sin parámetros de query ni
  extensiones `.html` visibles (Astro genera `index.html` por directorio).
- **Idioma**: `<html lang="es-MX">` ya declarado en el layout. Correcto.
- **Favicon**: ya completo — `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`.
- **Manifest PWA**: ya existente (`site.webmanifest`) con `name`, `short_name`,
  `theme_color`, `background_color`, iconos 192/512. Suficiente para un manifest básico;
  no se agregó service worker porque el sitio es contenido estático sin necesidad de
  funcionamiento offline.

Ninguno de estos cuatro puntos requirió cambios — ya estaban resueltos de rondas
anteriores.

---

## 12. Resumen de archivos modificados en esta ronda

- `src/layouts/Layout.astro` — fix del bug de canonical/og:url (§1), prop `keywords`
  (§2), JSON-LD enriquecido (§5).
- `src/pages/index.astro`, `src/pages/aviso-de-privacidad.astro` — `keywords` por
  página; `robots="noindex, follow"` en la de privacidad.
- `src/components/sections/Perico.astro` — CTA de cierre nuevo (§10); referencias de
  imagen a `.webp`.
- `src/components/Hero.astro`, `src/components/sections/FeaturedProjects.astro`,
  `src/components/sections/Agca.astro` — referencias de imagen a `.webp`.
- `public/images/{hero,proyectos,perico,agca}/*.webp` — 17 archivos nuevos; se
  eliminaron sus 17 equivalentes `.jpg`.

---

## 13. Checklist de pasos manuales pendientes

Estos son pasos que **no se pueden completar desde el repositorio** — requieren acceso a
cuentas externas del cliente (Google, redes sociales, dominio):

- [ ] **Google Search Console**: dar de alta la propiedad
  `https://publifix.github.io/grupo-aguilar/`, verificar propiedad (vía el archivo HTML
  de verificación o meta tag — decirme cuando lo tengan y lo agrego al `<head>`), y
  enviar el sitemap (`sitemap-index.xml`) manualmente la primera vez.
- [ ] **Google Business Profile**: crear/reclamar la ficha de Grupo Corporativo Aguilar
  en Veracruz. De ahí sale la dirección verificada, coordenadas geográficas reales y
  horario de atención — con esos datos confirmados puedo agregar `geo` y
  `openingHoursSpecification` al JSON-LD (hoy omitidos a propósito, ver §5).
- [ ] **Verificar redes sociales enlazadas en `sameAs`**: confirmar que
  facebook.com/GrupoCorporativoAguilar, x.com/GrupoAguilarGCA,
  instagram.com/grupoaguilargca y linkedin.com/company/grupo-corporativo-aguilar sean
  las cuentas oficiales reales y estén activas (no se verificó su existencia desde este
  entorno, solo se preservaron las que ya estaban en el JSON-LD).
- [ ] **Rich Results Test**: una vez desplegado el cambio, correr la URL de producción
  por https://search.google.com/test/rich-results para confirmar que Google interpreta
  correctamente el `GeneralContractor` + `department` + `contactPoint`.
- [ ] **Revisión legal del Aviso de Privacidad**: el propio texto de la página ya
  advierte que es un borrador provisional pendiente de validación por el área legal —
  sigue pendiente.
- [ ] **Google Analytics / Search Console — monitoreo de Core Web Vitals**: si se desea
  medir el impacto real de la conversión a WebP (§9) y el fix de canonical (§1) en el
  tráfico orgánico, conviene tener GA4 o al menos revisar el reporte de "Rendimiento" en
  Search Console después de 2–4 semanas.
- [ ] **Dominio propio (opcional)**: hoy el sitio vive bajo `publifix.github.io/grupo-
  aguilar/`, un subpath de un dominio de terceros — no es ideal para marca ni para SEO a
  largo plazo comparado con un dominio propio (ej. `grupoaguilar.com.mx`) con HTTPS. Si
  el cliente ya tiene o planea comprar un dominio, avísenme para configurar el `CNAME`
  de GitHub Pages y actualizar `site`/`base` en `astro.config.mjs` (en ese caso `base`
  pasaría a ser `/` y desaparece todo el manejo de subpath de este documento).
- [ ] **Confirmar copy pendiente**: las descripciones de Star Médica y Constellation
  Brands en "Experiencia destacada" siguen siendo texto provisional (ver conversación
  previa) — no es un tema de SEO técnico, pero un texto genérico rinde peor en
  relevancia semántica que uno específico del proyecto real.
