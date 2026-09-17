// ============================================================
// yape.ts
// Genera el QR de pago Yape (estándar EMVCo) a partir SOLO de
// datos que el admin escribe en el panel: número Yape + titular.
//
// Yape usa un QR estático EMVCo (Point of Initiation Method = 11):
//   000201  (payload format)
//   010211  (QR estático, reutilizable)
//   02<len><+51XXXXXXXXX>   → cuenta del receptor
//   53 03 604               → moneda PEN (ISO 4217)
//   58 02 PE                → país
//   59 <len><titular>       → nombre del dueño de la cuenta
//   60 <len><banco>         → institución (BCP, Interbank, …)
//   6304<CRC-16/CCITT>      → suma de verificación obligatoria
// ============================================================

const BANCO_QR = 'BCP'
const NUMERO_CODIGO_PAIS = '+51'

/**
 * CRC-16/CCITT-FALSE (polinomio 0x1021, init 0xFFFF, sin reflejo,
 * sin XOR final). Es el CRC que exige EMVCo para el campo 63.
 */
function crc16CCITT(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021
      else crc <<= 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Campo TLV de EMVCo: ID + longitud de 2 dígitos + valor. */
function campo(id: string, valor: string): string {
  const longitud = valor.length.toString().padStart(2, '0')
  return `${id}${longitud}${valor}`
}

/** Limpia el texto EMVCo: MAYÚSCULAS, sin acentos, ASCII imprimible. */
function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 \\.'\\-]/g, '')
    .toUpperCase()
}

/** Número Yape en formato +51XXXXXXXXX (solo los 9 dígitos del móvil). */
export function normalizarNumeroYape(numero: string | null): string {
  const digitos = (numero ?? '').replace(/\D/g, '').slice(0, 9)
  if (digitos.length < 9) return ''
  return `${NUMERO_CODIGO_PAIS}${digitos}`
}

/**
 * Payload EMVCo completo (con CRC) del QR de Yape.
 * Devuelve '' si falta el número o es inválido.
 */
export function payloadQRYape(
  numero: string | null,
  titular?: string | null,
  banco?: string | null,
): string {
  const cuenta = normalizarNumeroYape(numero)
  if (!cuenta) return ''

  const nombre = normalizarTexto(titular?.trim() || 'CONTACTO').slice(0, 25) || 'CONTACTO'
  const institucion = normalizarTexto(banco?.trim() || BANCO_QR).slice(0, 25) || BANCO_QR

  const sinCrc =
    '000201' +
    '010211' +
    campo('02', cuenta) +
    campo('53', '604') +
    campo('58', 'PE') +
    campo('59', nombre) +
    campo('60', institucion) +
    '6304'

  return sinCrc + crc16CCITT(sinCrc)
}

/** URL de la imagen QR (api.qrserver.com, igual que los QR de jurados). */
export function urlQRYape(
  numero: string | null,
  titular?: string | null,
  banco?: string | null,
  size = 220,
): string {
  const data = payloadQRYape(numero, titular, banco)
  if (!data) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}