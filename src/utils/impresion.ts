import type { Jurado } from '../types/database'
import { urlQR } from '../services/jurado.service'

/**
 * Abre una vista de impresión con las tarjetas de acceso de todos los jurados.
 * Desde el cuadro de diálogo del navegador el administrador elige
 * "Guardar como PDF" para descargar el documento.
 */
export function imprimirTarjetasAcceso(eventoNombre: string, jurados: Jurado[]): void {
  if (jurados.length === 0) return

  const cards = jurados
    .map(
      (j) => `
      <div class="card">
        <div class="top">
          <span class="logo">🏆</span>
          <div>
            <span class="sigec">SIGEC</span>
            <span class="sub">Acceso del jurado</span>
          </div>
        </div>
        <div class="nombre">${j.nombre}</div>
        <div class="codigo">${j.codigo}</div>
        <img src="${urlQR(j.codigo, 200)}" alt="QR ${j.codigo}" width="200" height="200" />
        <div class="url">${window.location.origin}/jurado/activar?codigo=${j.codigo}</div>
      </div>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>SIGEC · Accesos del jurado</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .evento { font-size: 12px; color: #64748b; margin: 0 0 16px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card { border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 16px; text-align: center; break-inside: avoid; }
  .top { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .logo { font-size: 20px; }
  .sigec { display: block; font-weight: 700; font-size: 13px; }
  .sub { color: #64748b; font-size: 10px; }
  .nombre { font-size: 14px; font-weight: 700; margin-top: 8px; }
  .codigo { font-size: 16px; font-weight: 700; letter-spacing: 3px; color: #b45309; margin: 2px 0 8px; }
  img { display: block; margin: 0 auto; }
  .url { font-size: 9px; color: #64748b; word-break: break-all; margin-top: 8px; }
</style>
</head>
<body>
<h1>SIGEC · Tarjetas de acceso del jurado</h1>
<p class="evento">Evento: <strong>${eventoNombre}</strong> · Escanea el QR para activar la cuenta</p>
<div class="grid">${cards}</div>
<script>
  window.addEventListener('load', function () { window.print(); });
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=860,height=680')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
}