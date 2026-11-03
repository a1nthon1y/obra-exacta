# Publicación de Obra Exacta

Fecha: 03/11/2026

## Veredicto

**Sí se puede publicar como beta pública controlada.** El build pasa, la app funciona en
celular, guarda la obra en el navegador y ya tiene una base técnica de SEO y PWA.

**No la presentaría todavía como sustituto de un ingeniero ni como cálculo definitivo de
compra.** El metrado es referencial y las medidas estructurales deben validarse con un
ingeniero colegiado. Para una vivienda de 1 a 2 pisos, la app es una buena ayuda de
presupuesto; para 3 a 5 pisos solo debe usarse con planos.

## Lo que ya está listo

- Build de producción con Vite (`npm run build`) y 78 pruebas aprobadas.
- SEO on-page: título y descripción cortos, canonical, `hreflang`, Open Graph y Twitter Card.
- Imagen social real `og-image.png` de 1200 × 630 (WhatsApp y Facebook no leen bien SVG).
- Iconos PWA de 192, 512 y 180 px; manifest con icono maskable.
- Service worker: después de la primera visita la app abre sin internet.
- Contenido visible para el usuario y para buscadores: qué se calcula, cómo funciona y FAQ.
- JSON-LD: `WebSite`, `Organization`, `WebApplication` y `FAQPage`.
- Cabeceras de seguridad y caché para assets en `vercel.json`.

## Antes de publicar

1. **Dominio:** el canonical y las URLs sociales apuntan a
   `https://obra-exacta.vercel.app/`. Si el dominio final es otro, actualizar:
   `index.html`, `public/robots.txt` y `public/sitemap.xml`.
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

## Limitaciones conocidas

- Es una SPA: hoy hay una sola URL indexable. El siguiente salto de SEO es prerenderizar o
  crear páginas estáticas por calculadora (`/calculadora-de-cemento`, `/calculadora-de-muros`,
  etc.) con contenido propio y enlaces internos.
- No hay backend, autenticación ni sincronización entre dispositivos.
- El respaldo JSON es la forma de mover una obra de un dispositivo a otro.
- Las fuentes se cargan desde Google Fonts; si se quiere eliminar esa dependencia, self-host.
- La app no reemplaza planos, licencia de construcción ni revisión estructural.
