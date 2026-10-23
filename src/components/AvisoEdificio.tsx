import React from 'react';
import { useObraStore } from '../store/obraStore';

interface Props {
  /** Si es true, muestra el nombre del proyecto y el piso activo. */
  conProyecto?: boolean;
  tono?: 'bad' | 'warn';
  children: React.ReactNode;
}

/**
 * Aviso persistente cuando hay un proyecto de edificio activo.
 *
 * La app no predimensiona estructuras de 3–5 pisos: el metrado debe salir de
 * los planos aprobados por un ingeniero. Este bloque recuerda ese límite en
 * las calculadoras y en el resultado.
 */
export const AvisoEdificio: React.FC<Props> = ({ conProyecto = true, tono = 'bad', children }) => {
  const proyectos = useObraStore(s => s.proyectos);
  const proyectoActivoId = useObraStore(s => s.proyectoActivoId);
  const pisoActivo = useObraStore(s => s.pisoActivo);
  const proyecto = proyectos.find(p => p.id === proyectoActivoId);

  if (!proyecto) return null;

  return (
    <div className={`aviso ${tono}`} style={{ marginBottom: 12 }}>
      <span className="aviso-icon" aria-hidden="true">🏢</span>
      <div style={{ minWidth: 0 }}>
        {conProyecto && (
          <div style={{ fontWeight: 700 }}>
            {proyecto.nombre} · Piso {pisoActivo} · {proyecto.pisos} pisos
          </div>
        )}
        <div style={{ marginTop: conProyecto ? 2 : 0, lineHeight: 1.45 }}>
          {children}
        </div>
      </div>
    </div>
  );
};
