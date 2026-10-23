# ⚒️ Obra Exacta

Calculadora de materiales de construcción para obras en Perú. Ingresas las medidas de tu
obra y obtienes cuánto material comprar: cemento, arena, piedra, ladrillos, fierro, etc.
Sin registro y sin pagos.

> Las cantidades son referenciales y se basan en prácticas habituales peruanas (RNE).
> Confirma las medidas importantes con el capataz o maestro de obra.

## Etapas cubiertas

| # | Etapa | Qué calcula |
|---|-------|-------------|
| 01 | 🏗️ Cimientos | Excavación, cimiento ciclópeo y sobrecimiento |
| 02 | ⬜ Zapata aislada | Por carga axial, suelo y presión admisible |
| 03 | 🧱 Muros | Ladrillo, mortero y esbeltez |
| 04 | 🏛️ Columnas | Concreto, fierro y estribos |
| 05 | 📐 Vigas | Concreto y fierro de refuerzo |
| 06 | 🔲 Losa aligerada | Viguetas, ladrillo de techo y concreto |
| 07 | 🪜 Escalera | Escalones, concreto y fierro |
| 08 | 🎨 Acabados | Tarrajeo, piso y pintura |

Cada etapa incluye un visor técnico (3D y cortes 2D con cotas) para revisar la
geometría antes de comprar material.

## Stack

- React 19 + TypeScript
- Vite 8
- Three.js para los visores 3D
- Zustand para el estado de "Mi obra" (persistido en el navegador)
- Oxlint como linter

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # tsc -b && vite build
npm run preview  # previsualizar el build
npm run lint     # oxlint
```

## Estructura

```
src/
├── components/   # visores 3D, cortes 2D y UI compartida
├── config/       # etapas de obra (fuente única de verdad)
├── engine/       # cálculos, tipos y tablas de rendimiento
├── pages/        # una calculadora por etapa + Mi obra
├── store/        # estado global (Zustand)
└── utils/        # exportación a PDF
```

## Estado del proyecto

En desarrollo activo. El motor de cálculo (`src/engine/calc.ts`) concentra las fórmulas
y las tablas de dosificación.
