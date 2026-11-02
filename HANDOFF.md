# Obra Exacta — estado para continuar

Fecha de corte: 23/10/2026
Última actualización: 02/11/2026 — P1 de metrado (estribos de solera, contrapiso, escalera, corte y cimientos)

## Cambios 26/10/2026 — P0 de revisión técnica

- **Acero con unidad correcta:** `cant` de un material va siempre en la unidad del
  catálogo (varilla, bolsa, m³, kg). Antes el fierro se guardaba en kg con unidad
  "varilla 9 m", y "Mi Obra" cotizaba 88 kg como 88 varillas (~12× el subtotal real).
- **Consolidado separado y probado:** `totalizarObra` vive en `src/store/totalizar.ts` y
  detecta partidas antiguas guardadas con el acero en kg (usa `comprar`, que siempre
  estuvo en varillas). `src/store/catalogo.ts` centraliza el catálogo.
- **Citas corregidas:** se quitó "E.060 Art. 15.2.2/15.2.3" (cimiento), "E.070 cláusula
  5.3" (pandereta) y el "0.50 m (RNE E.050 / Sencico)". Ahora se distingue norma de
  práctica de obra.
- **Alambre:** el catálogo decía "N°8" y el cálculo pide N°16. Corregido el nombre.
- **Pruebas dentro del proyecto:** `npm test` (Vitest). 9 pruebas: unidad de compra de
  todos los materiales, acero en varillas, suma antes de redondear, datos antiguos y
  avisos normativos.

Verificado: `npm test` (9/9), `npx oxlint src` (0), `npm run build` (OK, aviso de chunk
por Three.js sin cambios).

## Cambios 26/10/2026 — P1 de revisión técnica

- **Confinada vs pórticos:** columnas de albañilería confinada ya no se comparan con la
  sección 25×25 ni con la cuantía de 1% de E.060. Se exige el espesor del muro (13 cm en
  soga) y el mínimo de 4 varillas de 3/8" de E.070. En pórticos se mantiene 25 cm y la
  cuantía 1%–6% (con aviso sobre el 4% práctico). Los estribos de confinada van @10 cm en
  los extremos y @20 cm al centro; en pórticos rige 8 db.
- **Sugeridor de columnas:** `sugerirColumna` devuelve 13×25 (1 piso) y 13×30 (2 pisos,
  luz 4–5 m) con 4 varillas, en vez de 25×25 con 5/8". Los supuestos ya no prometen el 1%.
  Se agregó "muros que no sean de soga" a lo que no cubre.
- **f'c mínimo por elemento:** pórticos < 210 es error; confinada < 175, vigas, losa y
  escalera < 210 y zapata < 175 son advertencias.
- **Recubrimiento de zapata:** 7.5 cm (concreto vaciado contra el terreno). Antes 5 cm.
- **Losa aligerada:** el espesor automático se calcula con la luz de la vigueta (`largo`),
  no con la dimensión mayor del paño. Se agregó la malla de temperatura Ø 1/4" @ 25 cm
  (~8 m/m²), que antes no se metraba.
- **Lenguaje:** "capataz/maestro" reemplazado por "maestro de obra" para cantidades y
  "ingeniero colegiado" para estructura (README, App, Resultado, MiObra, avisos del motor).
  También se corrigió la ficha del visor de columnas ("ni 15 cm en los extremos").
- **Pruebas:** 21 en total. Nuevas: confinada sin falso aviso de cuantía, rechazo de
  columna más angosta que el muro, pórtico 20×20, f'c por sistema, luz de vigueta en losa,
  malla de temperatura, recubrimiento de zapata y f'c bajo en cada elemento.

Verificado: `npm test` (21/21), `npx tsc --noEmit`, `npx oxlint src` (0), `npm run build`
(OK, 1,035.77 kB, mismo aviso de chunk). Playwright (temporal): sugerencia 13 × 25,
resultado de confinada sin aviso de cuantía, losa con malla de temperatura y edición de
la expectativa de `sugerir-edificio`.

## Cambios 27/10/2026 — Correcciones P0/P1 de la revisión civil (RNE/Capeco)

### P0 — Cimientos, contrapiso, zapata

**Cimientos (`src/engine/calc.ts`, `types.ts`, `CalcCimientos.tsx`, `CimientoViewer3D.tsx`, `CimientoCorte2D.tsx`)**
- `ParamsCimientos` acepta ahora `altoCimiento` (m, opcional, default 0.50) separado de `prof` (profundidad de excavación). Antes `volCimiento = largo × ancho × prof` llenaba toda la zanja de concreto ciclópeo, sobreestimando cemento.
- Volumen de cimiento = `largo × ancho × altoCimiento`; excavación = `largo × ancho × prof` (sin cambios).
- El sobrecimiento sube desde la cabeza del cimiento hasta la altura visible: altura total = `prof − altoCimiento + alto`. Su volumen y cemento se calculan sobre esa altura total; el encofrado solo cubre la parte visible (`largo × alto × 2`).
- El visor 3D dibuja el cimiento en el fondo de la zanja, el relleno sobre él y el sobrecimiento desde la cabeza del cimiento; el plano 2D acota profundidad de zanja, altura de cimiento y altura de sobrecimiento.
- Nuevo aviso: cimiento menor a 0.30 m; sobrecimiento enterrado > 0.50 m.

**Contrapiso (`src/engine/calc.ts`, `catalogo.json`, `CalcAcabados.tsx`)**
- Si `eContra < 8 cm`: mortero 1:5 sin piedra (la piedra mediana 3"–4" no cabe); si ≥ 8 cm: concreto 1:8 + 25% PM como antes.
- Catálogo: agregados `arena_fina` (tarrajeo), `pegamento_ceramico` (~4.5 kg/m², bolsa 25 kg) y `fragua` (~0.5 kg/m²). El tarrajeo usa `arena_fina`; el contrapiso usa `arena_gruesa` solo si lleva piedra.
- Resumen y lista de compras incluyen pegamento y fragua cuando hay piso cerámico.
- Aviso: "Contrapiso de X cm: se calcula con mortero 1:5 sin piedra..."

**Zapata aislada (`src/engine/calc.ts`)**
- `dimensionarZapata` y `calcZapata` mayoran la carga 10% por peso propio y relleno (`MAYORACION_ZAPATA = 1.10`) antes de hallar el área y el lado. El texto de `pasos` ya no dice "agreguele ~10%", sino que informa que está incluido.
- Lado de ejemplo con carga 15 tn y pa 1.2: pasa de 1.15 m a 1.20 m.

### P1 — Citas, umbrales, vigas, losa, muros, acabados, columnas

**Citas y umbrales normativos**
- Muros: cita de esbeltez corregida de "E.070 Art. 19.1.b" a "19.1.a".
- Escalera: Blondel acepta 60–64 cm (era 60–65); contrahuella máxima 0.18 m (era 0.195); ancho mínimo 0.90 m entre muros (0.80 m solo si un lado está abierto, RNE A.020 Art. 15.1).

**Vigas (`src/engine/calc.ts`, `types.ts`, `CalcVigasLosa.tsx`, `VigaViewer3D.tsx`)**
- Nuevo `sis` ('confinada' | 'porticos', default 'confinada'): en pórticos se rechaza base < 25 cm y b/h < 0.3 (E.060); en confinada no se exige 25 cm (el ancho suele ser el del muro, 13 cm).
- Nuevo `espesorLosa` (cm): se descuenta del hormigón y del encofrado lateral (`hUtil = h − espesorLosa`); el visor dibuja la losa de compresión sobre la viga.
- `d` efectivo mejora a `h − rec − Øestribo − Øbarra/2` para el As,mín de E.060.
- Estribo bajo la losa usa `hUtil`.

**Losa aligerada (`src/engine/tablas.json`, `src/engine/calc.ts`, `src/engine/calc.test.ts`)**
- Espesor automático: 5.5 m → 22 cm (L/25), tabla `volumenConcretoLosa` agrega `"22": 0.0925`.
- Viguetas: `floor(ancho / 0.40) + 1` (una en cada borde; antes `ceil`, que en 4.0 m daba 10 y ahora da 11). → Corregido el 30/10: ver sección siguiente (con 4.20 m el `floor` dejaba 0.42 m entre ejes).

**Muros (`src/engine/calc.ts`)**
- Se usa siempre la fórmula geométrica `1 ÷ [(cara + junta) × (alto + junta)]` para `und/m²` (se elimina el salto tabla/fórmula); la tabla de Capeco queda solo como referencia de mortero.
- Aviso para pandereta: el mortero puede ser 1.5–2× el del KK18; subir desperdicio de mezcla.

**Columnas (`src/engine/sugerir.ts`, `src/pages/CalcColumnas.tsx`)**
- 2 pisos, luz 4–5 m: sugiere 13 × 30 con 6 Ø 3/8" (2 por capa) en vez de 4 Ø 1/2" (no constructible en una capa de 13 cm).
- Al cambiar el sistema a "Entre muros (confinada)" el recubrimiento por defecto pasa a 2 cm (con 4 cm una columna de 13 cm no es construible); en pórticos se mantiene 4 cm.

### Pruebas agregadas
- `calc.test.ts`: cimientos con cimiento separado (menos cemento que llenar la zanja), error si cimiento > zanja; contrapiso 4 cm sin piedra mediana y con arena_fina; contrapiso 10 cm con piedra mediana, pegamento y fragua; zapata lado 1.20 m con 10% de sobrecarga; vigas con losa (menos hormigón y encofrado 0.45 m), pórtico base < 25 cm rechaza, confinada no, fórmula de `d`; muros KK18 cabeza ~65.7 und/m² por fórmula, aviso de pandereta; losa 5.5 m → 22 cm, 4.0 m ancho → 11 viguetas, factor 0.0925; escalera ancho < 0.90 m, contrahuella > 0.18 m, Blondel 60–64 cm.
- `sugerir.test.ts`: 2 pisos 4.5 m espera nVar 6, dVar '3/8'.

### Verificación
```
npm test        → 38 passed (3 files)
npx tsc --noEmit → OK
npx oxlint src   → OK (0 errores)
npm run build    → OK (vite build, mismo aviso de chunk >500 kB por Three.js)
```

Pendiente de validación con ingeniero: fórmula de As,mín de vigas (se dejó 0.7√f'c/fy y
hay que confirmarla contra la edición impresa de E.060).
→ Cerrado el 30/10: `As,mín = 0.7·√f'c/fy · b · d` coincide con E.060 2009, num. 11.1.2.


## Cambios 30/10/2026 — P0 de la revisión civil

- **Viguetas:** `nViguetas = ceil(ancho/0.40 − ε) + 1` (antes `floor`). Con 4.20 m daba
  11 viguetas @ 0.42 m, fuera del máximo de 0.40 m; ahora da 12 @ 0.38 m. El paso muestra
  la separación real.
- **Escalera:** nuevo input `lanza` (cm, default 15, rango usual 12–20). Antes la losa se
  fijaba en 25 cm y sobreestimaba el concreto ~31% (2.8 m × 1.0 m: 1.75 → 1.21 m³). El
  visor 3D y el plano 2D usan el espesor ingresado.
- **Columnas de confinamiento:** se agrega el peralte mínimo de 15 cm (E.070 Art. 20.5; la
  propuesta 2019 pide 25 cm). Una 13×13 ya no pasa.
- **Cita de acero:** E.070 exige 4 barras como mínimo y deja el diámetro al diseño. Se dejó
  de afirmar que el Ø 3/8" es obligatorio; 4 Ø 1/2" se menciona como propuesta 2019.
- **Sugeridor de zapata:** `suelo='blando'` y `sis='porticos'` ahora devuelven
  `requiereIngeniero: true`, coherente con su lista `noAplica`.
- **Vigas:** el aviso de acero inferior insuficiente ya no se duplica.
- **Zapata:** el 10% de mayoración se documenta como criterio práctico, no como exigencia
  de E.050.
- **Pruebas:** 51 en total. Nuevas: losa 4.20 m y separación ≤ 0.40 m, columna 13×13 /
  13×25, cita de 4 barras, lanza 12 vs 20 cm, aviso fuera de rango, aviso único en vigas,
  zapata blando/pórticos y 10% sin E.050.

Verificado: `npm test` (51/51), `npx oxlint src` (0), `npm run build` (OK, mismo aviso de
chunk por Three.js).

### P1 — acero, f'c, losa y zapata (30/10/2026)

- **Plan de corte de acero:** nuevo `varillasDe9m(cantidad, largo)`, que compra por piezas
  (`floor(8.7/largo)` por varilla) en vez de por longitud total. En vigas de 4.5 m el
  desperdicio real es ~45% y antes se compraba ~42% menos. Aplicado a vigas, columnas,
  viguetas/bastones de losa y longitudinales de escalera.
- **Estribos de viga:** zona de confinamiento `2·h` (E.060), antes `2·d`.
- **f'c bajo mínimo:** ahora es `bad` (pide confirmación al guardar) en vigas, losa y
  escalera (<210) y zapata (<175); antes era solo advertencia.
- **Losa:** el selector manual incluye 22 cm (la tabla automática ya lo usaba).
- **Zapata:** barras con separación ≤ 0.20 m (`ceil(L/0.20)+1`; antes daba ~21 cm) y el
  aviso aclara que es predimensionado de área (no verifica punzonamiento, corte ni flexión).
- **Blondel:** textos unificados en 60–64 cm (el paso decía 60–65).
- **Pruebas:** 54. Nuevas: plan de corte en viga de 4.5 m, f'c como error, 7+7 barras en
  zapata de 1.20 m y aviso de punzonamiento.

Verificado: `npm test` (54/54), `npx oxlint src` (0), `npm run build` (OK).

### Escalera n−1 y solado de zapata (30/10/2026)

- **Escalera:** se separan contrahuellas y huellas. Con `n` contrahuellas el piso
  superior hace de última huella, así que el desarrollo es `(n−1)·hu` y el cuerpo
  escalonado tiene `n−1` triángulos. La lanza corre paralela a la línea de narices
  (`L = (n−1)·√(hu²+ch²)`), no de piso a piso. Para 2.8 m: 16 contrahuellas,
  15 huellas y 4.05 m (antes 4.32 m); el concreto baja ~6%. Visor 3D y plano 2D
  actualizados (última contrahuella al piso superior).
- **Solado de zapata:** 5 cm de concreto simple 1:10, 10 cm por lado, con cemento y
  hormigón en el metrado. Para 4 zapatas de 1.20 m: 0.392 m³ (≈1.3 bolsas + 0.35 m³
  de hormigón). Nueva dosificación `solado` en `tablas.json`.
- **Pruebas:** 56. Nuevas: 16/15 huellas y 4.05 m; solado de 0.392 m³ y material
  `hormigon`.

Verificado: `npm test` (56/56), `npx oxlint src` (0), `npm run build` (OK).

## Cambios 02/11/2026 — P1 de metrado (5 arreglos)

- **Estribos de viga confinada:** la viga de una solera ya no usa el `d/4` de
  pórtico. En `sis='confinada'` va el detalle usual 1@5, @10 en los extremos y
  @20 al centro; en `sis='porticos'` se mantiene E.060 (`d/4`, 8db, 20 cm y
  `d/2` en el resto). Para una solera 13×25 de 4.5 m los estribos bajan de 6 a 4
  varillas de 3/8".
- **Contrapiso ≥ 8 cm:** el agregado del concreto 1:8 + 25% piedra mediana se
  compra como `hormigon` (arena + grava), no como `arena_gruesa`. Se agrega
  `piedra_mediana` y el resumen/pasos muestran “Hormigón”. El contrapiso delgado
  (< 8 cm) sigue con mortero 1:5 y `arena_gruesa`.
- **Escalera:** `n = ceil(altura/0.18)` para que la contrahuella nunca supere
  18 cm. Antes con 3.30 m daba 18 contrahuellas de 18.3 cm; ahora da 19 de
  17.4 cm. El visor 3D usa el mismo criterio.
- **Plan de corte en zapata y escalera:** la zapata compra varillas por piezas
  (`varillasDe9m`) en vez de por longitud total; una zapata de 2.50 m pasa de 8
  a 10 varillas de 1/2" (3 piezas por barra). Los longitudinales de escalera
  suman 0.50 m de anclaje antes de aplicar el plan de corte.
- **Cimientos:** la UI ya no envía `altoCimiento=0.5` por defecto; si el campo
  queda vacío, el motor usa `min(0.50, prof)` y el visor muestra ese valor. Se
  aclara que la altura del sobrecimiento es la parte visible sobre el terreno y
  se rechaza `esp <= 0`. También se corrigió el `onFocus` del campo.
- **Pruebas:** 62 en total (54 en `calc.test.ts`). Nuevas: estribos de solera
  contra pórtico, contrapiso 10 cm con `hormigon` y sin `arena_gruesa`,
  contrahuella ≤ 18 cm en 2.4/2.6/2.8/2.9/3.3 m, plan de corte de zapata de
  2.50 m, anclaje y plan de corte en escalera, default de cimiento con
  `prof=0.4` y rechazo de `esp=0`.

Verificado: `npm test` (62/62), `npx oxlint src` (0), `npm run build` (OK,
1,046.31 kB, mismo aviso de chunk por Three.js).


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
- **Contexto antes de calcular:** todas las calculadoras muestran `ProyectoActivoBar` con el
  nombre del proyecto y un selector de piso. Ya no hay que llegar al resultado para saber
  dónde se guardará la partida.
- **Visores sin datos de ejemplo:** Cimientos, Muros, Vigas, Losa, Escalera, Acabados,
  Columnas y Zapata muestran `ViewerEspera` hasta que el usuario ingresa sus medidas. Se
  eliminó la esbeltez falsa que Muros mostraba con los campos vacíos.
- **Ejemplos bloqueados en edificios:** dentro de un proyecto 3–5, `Resultado` no permite
  guardar un cálculo marcado como EJEMPLO; el botón queda deshabilitado y explica que se
  necesitan las medidas del plano.

## Verificación de la última sesión

Ejecutado y aprobado:

```bash
npm test        # 62/62
npx oxlint src  # 0
npm run build   # OK
```

- Build correcto: JS `1,046.31 kB` (276.13 kB gzip), CSS `21.65 kB`.
- La advertencia de chunk mayor a 500 kB es por Three.js y ya existía.
- No se volvieron a correr las pruebas Playwright de sesiones anteriores.
- Persistencia: `localStorage`, clave `obra-exacta-v1`.
- Checkpoint anterior: `6f34b6f`. Los cambios de esta sesión (P1 de metrado)
  quedaron en el commit de checkpoint del 02/11/2026.

## Prioridad al retomar

1. **Validar con ingeniero colegiado:** rangos de columnas y zapatas, carga asumida de
   `1.0 t/m²` y mínimo de 5 t, fórmula de As,mín de vigas y recubrimientos. Ajustar textos
   y marcar claramente lo que es orientativo.
2. **Respaldo:** exportar/importar la obra completa en JSON. Debe funcionar también cuando
   Mi Obra está vacía, para restaurar en un teléfono nuevo.
3. **Edición por piso:** mover una partida a otro piso/proyecto y copiarla a varios pisos.
4. **Lenguaje y accesibilidad:** pasar términos técnicos a lenguaje claro en la UI, mover
   códigos de norma a ficha técnica/PDF y asociar `label`/`input` con `htmlFor`/`id`.
5. **Rendimiento y offline:** evaluar PWA, carga diferida de Three.js y pruebas unitarias
   del motor dentro del proyecto.
6. **Cierre documental:** actualizar el MD de especificación después de la validación técnica
   y de flujo.
7. **Git:** checkpoint del 02/11/2026 hecho; revisar el diff de los 5 arreglos de
   metrado antes de la próxima sesión.

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

- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-p0.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-sugerir-edificio.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-p1-columna.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-p1.spec.ts` (columna + losa)
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-floors-full.spec.ts`
- `C:\Users\PREDATOR\AppData\Local\Temp\opencode\obra-exacta-floors.spec.ts`

Ojo con el encoding: no reescribir estos `.spec.ts` con `Get-Content | Set-Content` en
PowerShell 5.1 (rompe los acentos). Usar la herramienta de escritura del agente.

Vite preview escucha en `localhost` (IPv6); usar `http://localhost:4173/`, no `127.0.0.1`.

La suite completa necesita timeout de 60 s. En Vite usar `domcontentloaded` y esperas
explícitas; `networkidle` no es confiable por el HMR. Las capturas pueden salir durante
la animación `fadeUp` de 0.18 s; esperar ~350 ms antes de fotografiar.

## Notas técnicas

- `src/index.css` está en Latin-1/Windows-1252 y usa CR. Evitar editarlo; preferir estilos inline.
- El scroll real está en `window`, no en `<main>`.
- Los campos nuevos del store son opcionales para no romper datos antiguos.
- Las etapas antiguas sin proyecto se tratan como "Casa".
- `AvisoEdificio` centraliza el aviso específico de 3–5 pisos.
- `ProyectoActivoBar` muestra el proyecto/piso antes de calcular y permite cambiar de piso.
- `ViewerEspera` es el estado vacío común de todos los visores: no dibuja geometría ni
  advertencias hasta que existan medidas.

## Para levantar mañana

```bash
npm run dev
```

Continuar por la validación con ingeniero o por el respaldo JSON.
