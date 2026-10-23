export interface ItemPdf {
  nombre: string;
  cantidad: number | string;
  unidad: string;
  desglose?: string;
  precio?: number;
  subtotal?: number;
}

export interface OptionsPdf {
  titulo: string;
  subtitulo?: string;
  etapasStr: string;
  items: ItemPdf[];
  totalEstimado?: number;
  pasos?: string[];
  avisos?: string[];
}

export function exportarReportePdf(opt: OptionsPdf): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const fechaStr = new Date().toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="es-PE">
<head>
  <meta charset="UTF-8">
  <title>${opt.titulo} - Obra Exacta Perú</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px;
      font-size: 12px;
      line-height: 1.45;
    }
    .header {
      border-bottom: 2px solid #ea580c;
      padding-bottom: 12px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: -0.02em;
      color: #ea580c;
      line-height: 1;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .doc-banner {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #ea580c;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .doc-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    .doc-etapas {
      font-size: 12px;
      color: #475569;
      margin-top: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 7px 10px;
      text-align: left;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11.5px;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .mat-name {
      font-weight: 700;
      color: #0f172a;
    }
    .mat-desglose {
      font-size: 10.5px;
      color: #0284c7;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-top: 2px;
    }
    .col-right {
      text-align: right;
      white-space: nowrap;
    }
    .cant-comprar {
      font-weight: 800;
      color: #0f172a;
      font-size: 12.5px;
    }
    .total-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
    .total-card {
      background: #fff7ed;
      border: 1.5px solid #fb923c;
      border-radius: 8px;
      padding: 10px 18px;
      text-align: right;
      min-width: 260px;
    }
    .total-card-label {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9a3412;
    }
    .total-card-value {
      font-size: 22px;
      font-weight: 900;
      color: #ea580c;
      line-height: 1.1;
      margin-top: 2px;
    }
    .normas-box {
      background: #f1f5f9;
      border-left: 3px solid #0284c7;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 10.5px;
      color: #334155;
      margin-bottom: 18px;
    }
    .pasos-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      background: #ffffff;
      font-size: 10.5px;
      margin-bottom: 18px;
    }
    .pasos-title {
      font-weight: 800;
      text-transform: uppercase;
      color: #475569;
      font-size: 10px;
      margin-bottom: 6px;
    }
    .paso-item {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #334155;
      padding: 2px 0;
      border-bottom: 1px dotted #f1f5f9;
    }
    .signatures {
      display: flex;
      justify-content: space-around;
      margin-top: 36px;
      padding: 0 20px;
    }
    .sig-block {
      width: 220px;
      text-align: center;
    }
    .sig-line {
      border-top: 1.5px dashed #94a3b8;
      margin-bottom: 4px;
    }
    .sig-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-role {
      font-size: 10px;
      color: #64748b;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 24px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">OBRA EXACTA</div>
      <div class="brand-sub">Calculadora Técnica y Metrado de Materiales (Perú)</div>
    </div>
    <div class="meta-box">
      <div><strong>Fecha:</strong> ${fechaStr}</div>
      <div><strong>Normativa:</strong> RNE E.070 / E.060 / Capeco</div>
    </div>
  </div>

  <div class="doc-banner">
    <div class="doc-title">${opt.titulo}</div>
    <div class="doc-etapas"><strong>Partida(s):</strong> ${opt.etapasStr}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 44%;">Material Comercial & Origen de Cálculo</th>
        <th style="width: 24%; text-align: right;">Qué Comprar</th>
        <th style="width: 16%; text-align: right;">Precio Ref.</th>
        <th style="width: 16%; text-align: right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${opt.items
        .map(
          (m) => `
        <tr>
          <td>
            <div class="mat-name">${m.nombre}</div>
            ${m.desglose ? `<div class="mat-desglose">↳ ${m.desglose}</div>` : ''}
          </td>
          <td class="col-right">
            <span class="cant-comprar">${m.cantidad}</span>
            <span style="color:#64748b; font-size:10.5px;"> ${m.unidad}</span>
          </td>
          <td class="col-right" style="color: #64748b;">
            ${m.precio ? `S/ ${m.precio.toFixed(2)}` : '—'}
          </td>
          <td class="col-right" style="font-weight: 700; color: #0f172a;">
            ${m.subtotal ? `S/ ${m.subtotal.toFixed(0)}` : '—'}
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  ${
    opt.totalEstimado && opt.totalEstimado > 0
      ? `
    <div class="total-container">
      <div class="total-card">
        <div class="total-card-label">Presupuesto Estimado Total</div>
        <div class="total-card-value">S/ ${opt.totalEstimado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        <div style="font-size: 9.5px; color: #9a3412; margin-top: 2px;">Precios referenciales de mercado Lima/Perú</div>
      </div>
    </div>
  `
      : ''
  }

  ${
    opt.pasos && opt.pasos.length > 0
      ? `
    <div class="pasos-box">
      <div class="pasos-title">📐 Sustento y Pasos del Cálculo:</div>
      ${opt.pasos.map((p) => `<div class="paso-item">${p}</div>`).join('')}
    </div>
  `
      : ''
  }

  <div class="normas-box">
    <strong>📋 Fundamento Técnico:</strong><br>
    • Cantidades calculadas aplicando especificaciones del Reglamento Nacional de Edificaciones (RNE E.070 Albañilería, RNE E.060 Concreto Armado y Tablas Oficiales de Capeco).<br>
    • Incluye coeficientes de merma y desperdicio comercial (rotura de ladrillos, mermas de concreto y corte de varillas).
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">Maestro de Obra / Capataz</div>
      <div class="sig-role">Responsable de Ejecución</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">Propietario / Cliente</div>
      <div class="sig-role">Conforme de Presupuesto</div>
    </div>
  </div>

  <div class="footer">
    Documento generado por <strong>Obra Exacta Perú</strong> — Herramienta de metrados y cotizaciones para construcción civil.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  printWindow.document.write(html);
  printWindow.document.close();
}
