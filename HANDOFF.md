# Obra Exacta — estado para continuar

Fecha de corte: 23/10/2026

## Estado actual

La app está estable y compila. El flujo principal ya cubre:

- Cálculo por etapas: cimientos → zapata → muros → columnas → vigas → losa → escalera → acabados.
- Zapata con dos modos: "Ya tengo la medida" y "Sugiéreme".
- Zapata estima la carga con el paño entre columnas, número de pisos y posición de la columna.
- Sección **Edificio 3–5 pisos** con proyectos, piso activo, checklists y derivación a ingeniero.
- Cada partida guarda `proyectoId`, `proyectoNombre` y `piso`.
- **Mi Obra** filtra por obra, casa, proyecto o piso; totales, PDF y WhatsApp respetan el filtro.
- Los proyectos solo se eliminan cuando están vacíos.
- **Bloqueo de “Sugiéreme” en edificios:** con un proyecto de 3–5 pisos activo, Columnas y
  Zapata abren directamente en “Ya tengo la medida”, muestran un aviso rojo y no permiten
  pedir una medida usual. El visor espera las medidas del plano antes de mostrar una geometría.

## Verificación de la última sesión

Ejecutado y aprobado:

```bash
npm run build
npx oxlint src
```

- Build correcto: JS `1,027.86 kB` (270.92 kB gzip), CSS `21.65 kB`.
- La advertencia de chunk mayor a 500 kB es por Three.js y ya existía.
- Playwright: 2 pruebas nuevas del bloqueo pasaron; suite anterior de pisos (2 pruebas) pasó.
- Capturas revisadas: aviso visible, pestaña “No sé la medida” deshabilitada y visor en espera.
- Persistencia: `localStorage`, clave `obra-exacta-v1`.
- El repo git existe, pero el trabajo de la sesión sigue sin commit.

## Prioridad al retomar

1. **Validar con ingeniero colegiado:** rangos de columnas y zapatas, carga asumida de
   `1.0 t/m²` y mínimo de 5 t. Ajustar textos y marcar claramente lo que es orientativo.
2. **Respaldo:** exportar/importar la obra completa en JSON. Debe funcionar también cuando
   Mi Obra está vacía, para restaurar en un teléfono nuevo.
3. **Edición por piso:** mover una partida a otro piso/proyecto y copiarla a varios pisos.
4. **Rendimiento y offline:** evaluar PWA, carga diferida de Three.js y pruebas unitarias
   del motor dentro del proyecto.
5. **Cierre documental:** actualizar el MD de especificación después de la validación técnica
   y de flujo.
6. **Git:** hacer un commit de checkpoint con el estado verificado actual.

## Reglas de producto vigentes

- 1–2 pisos: "Sugiéreme" es orientativo.
- 3–5 pisos: sección Edificio con dos puertas: "Tengo planos" o "No tengo planos todavía".
- Más de 5 pisos: fuera de alcance del producto.
- No usar "Sugiéreme" para 3–5 pisos.
- La sugerencia es una **medida usual**, nunca un "diseño seguro".
- Fuera de rango: derivar a ingeniero.
- El metrado es el núcleo; costo y lista de compras son secundarios.
- Normas en lenguaje claro en la UI; códigos solo en ficha técnica/PDF.
- Orden fijo: cimientos → zapata → muros → columnas → vigas → losa → escalera → acabados.

## Pruebas temporales

Las pruebas Playwright están fuera del proyecto:

- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-sugerir-edificio.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-floors-full.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-floors.spec.ts`

La suite completa necesita timeout de 60 s. En Vite usar `domcontentloaded` y esperas
explícitas; `networkidle` no es confiable por el HMR. Las capturas pueden salir durante
la animación `fadeUp` de 0.18 s; esperar ~350 ms antes de fotografiar.

## Notas técnicas

- `src/index.css` está en Latin-1/Windows-1252 y usa CR. Evitar editarlo; preferir estilos inline.
- El scroll real está en `window`, no en `<main>`.
- Los campos nuevos del store son opcionales para no romper datos antiguos.
- Las etapas antiguas sin proyecto se tratan como "Casa".
- `AvisoEdificio` centraliza el aviso de proyecto activo en calculadoras y resultados.

## Para levantar mañana

```bash
npm run dev
```

Continuar por la validación con ingeniero o por el respaldo JSON.
