# Publicación de Metra Perú

Fecha: 03/11/2026 · Actualizado: 12/11/2026 (landings SEO + vista de escritorio)

Marca y dominio objetivo: **Metra Perú** (`https://metraperu.com/`).

## Veredicto

**Sí se puede publicar como beta pública controlada.** El build pasa, la app funciona en
celular, guarda la obra en el navegador y ya tiene una base técnica de SEO y PWA.

**No la presentaría todavía como sustituto de un ingeniero ni como cálculo definitivo de
compra.** El metrado es referencial y las medidas estructurales deben validarse con un
ingeniero colegiado. Para una vivienda de 1 a 2 pisos, la app es una buena ayuda de
presupuesto; para 3 a 5 pisos solo debe usarse con planos.

## Lo que ya está listo

- Build de producción con Vite (`npm run build`) y 80 pruebas aprobadas.
- SEO on-page: título y descripción cortos, canonical, `hreflang`, Open Graph y Twitter Card.
- Imagen social real `og-image.png` de 1200 × 630 (WhatsApp y Facebook no leen bien SVG).
- Iconos PWA de 192, 512 y 180 px; manifest con icono maskable.
- Service worker: después de la primera visita la app abre sin internet.
- Contenido visible para el usuario y para buscadores: qué se calcula, cómo funciona y FAQ.
- JSON-LD: `WebSite`, `Organization`, `WebApplication` y `FAQPage`.
- Cabeceras de seguridad y caché para assets en `vercel.json`.
- **Lista de compra con checkmarks y avance** en Mi obra, compartida por WhatsApp y
  respaldada en JSON. Es el diferenciador visible frente a calculadoras que solo dan precio.
- **Modo obra** de alto contraste y letras grandes para usar la app en campo.
- Sello visible `🇵🇪 Hecho para Perú · RNE + Capeco · Sin registro · Offline`.

## Antes de publicar

1. **Dominio:** registrar `metraperu.com` y apuntar Vercel a ese dominio. El canonical y
   las URLs sociales ya apuntan a `https://metraperu.com/`. Si cambia, actualizar:
   `index.html`, `public/robots.txt`, `public/sitemap.xml` y `public/sw.js`.
2. **Vercel:** importar el repositorio, framework Vite, build `npm run build`, salida `dist`.
3. **Search Console:** verificar la propiedad, enviar `/sitemap.xml` y revisar la cobertura.
4. **Vista previa social:** pasar la URL por el depurador de Facebook/WhatsApp y X para
   confirmar que aparece `og-image.png`.
5. **Dispositivos:** probar en un iPhone y un Android reales: instalar la PWA, activar modo
   avión y comprobar que Inicio y una calculadora siguen abriendo.
6. **Validación técnica:** revisar con un ingeniero colegiado los rangos de columnas,
   zapatas, vigas y el aviso de 3 a 5 pisos.
7. **Legal y privacidad:** los datos quedan en `localStorage`; no hay cuentas ni servidor.
   Añadir una nota de privacidad si se incorpora analítica o soporte.

## Despliegue

```bash
npm ci
npm test
npx oxlint src
npm run build
```

Luego subir el repositorio a Vercel o ejecutar `vercel --prod` con la CLI.

## Después de publicar

- Revisar Core Web Vitals en PageSpeed Insights (móvil).
- Validar los datos estructurados con Rich Results Test.
- Confirmar que `/og-image.png`, `/manifest.json`, `/sw.js` y `/icons/*.png` devuelven 200.
- Medir instalaciones de PWA y errores de consola durante una semana.
- Incorporar analítica solo si se acepta la implicancia de privacidad.

## Landings SEO por calculadora (12/11/2026)

Ya NO es una SPA de una sola URL. Hay **9 landings estáticas** en `public/` (Vite las copia
a `dist` y Vercel las sirve directo; el filesystem tiene prioridad sobre la rewrite):

| URL | Palabra clave objetivo | Deep-link a la app |
|-----|------------------------|--------------------|
| `/calculadora-de-cemento/` | cuántas bolsas de cemento por m³ | `/#vigas` |
| `/calculadora-de-cimientos/` | cimiento ciclópeo | `/#cimientos` |
| `/calculadora-de-zapatas/` | zapata aislada pa del suelo | `/#zapata` |
| `/calculadora-de-ladrillos/` | cuántos ladrillos por m² | `/#muros` |
| `/calculadora-de-columnas/` | sección y estribos de columna | `/#columnas` |
| `/calculadora-de-vigas/` | viga solera material | `/#vigas` |
| `/calculadora-de-losa-aligerada/` | espesor y ladrillos de techo | `/#losa` |
| `/calculadora-de-escalera/` | huella y contrahuella | `/#escalera` |
| `/calculadora-de-acabados/` | tarrajeo por m², pintura | `/#acabados` |

- Cada landing: HTML estático **sin JavaScript**, CSS compartido `/landings.css`,
  contenido propio con tablas Capeco, FAQ visible + JSON-LD (`WebPage`, `BreadcrumbList`,
  `FAQPage` por página), OG/Twitter y canonical con barra final.
- Datos extraídos del motor real (`tablas.json`): 9.73 bolsas/m³ f'c 210, 37 und/m² KK18
  soga, espesor losa L/25, malla Ø1/4 @25, 4.5 kg/m² pegamento, 30 m²/gal látex, etc.
- **Deep-links por hash en la app:** `metraperu.com/#muros` abre esa calculadora
  (escucha `hashchange` en `App.tsx`; `#mi-obra` abre Mi obra). Las landings enlazan así.
- **Enlazado interno:** el footer de Inicio enlaza las 9 landings; cada landing enlaza a
  las otras 8 y a la app. Sitemap actualizado con las 10 URLs.
- Vista previa validada con Playwright (inicio, calculadora 2 columnas, landing, CTA →
  deep-link, móvil).

## Vista de escritorio (12/11/2026)

- Nuevo `src/desktop.css` (importado después de `index.css`, que queda intacto):
  media query `@media (min-width: 1024px)`.
- Contenedor 1140 px, header 64 px, etapas en grilla de 4, portada con tipografía grande.
- **Calculadoras a 2 columnas:** formulario + avisos + resultado a la izquierda; visor
  técnico a la derecha con `position: sticky`. Se activa con la clase `main-calc` en
  `<main>` y `grid-auto-flow: dense`; los visores van por `.viewer-card`/`.viewer-2d`.
- `ProyectoActivoBar` ahora tiene clase `proyecto-bar` (para abarcar las 2 columnas).
- Barra inferior → **pastilla flotante centrada** de 480 px con `padding-bottom: 96px`
  en `.page` para que no tape el botón principal.
- El móvil (<1024 px) queda byte a byte igual: es la base para empaquetar la PWA como
  TWA en Play Store.

## Limitaciones conocidas

- No hay backend, autenticación ni sincronización entre dispositivos.
- El respaldo JSON es la forma de mover una obra de un dispositivo a otro.
- Las fuentes se cargan desde Google Fonts; si se quiere eliminar esa dependencia, self-host.
- La app no reemplaza planos, licencia de construcción ni revisión estructural.
- Las landings son estáticas: si cambia una dosificación del motor, hay que editar a mano
  la tabla de la landing correspondiente.
