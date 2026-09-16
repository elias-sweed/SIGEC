import { useMemo } from 'react'
import { useCertamen } from '../context/CertamenContext'
import logo from '../assets/Logo/logo.png'

/**
 * Pantalla pública para proyectores: muestra un QR gigante que apunta al
 * dominio actual + "/votar", para que el público escanee y vote desde su móvil.
 */
export default function VotoQR() {
  const { eventoCandidato } = useCertamen()

  const urlVotar = `${window.location.origin}/votar`
  const urlQR = useMemo(
    () =>
      `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=16&data=${encodeURIComponent(
        urlVotar,
      )}`,
    [urlVotar],
  )

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-navy-950 px-6">
      {/* Fondo con beams */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-navy-900 via-navy-950 to-black" />

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 text-center">
        {/* Emblema + evento */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-14 w-14 rounded-xl object-contain ring-1 ring-gold-500/40" />
          <div className="text-left leading-tight">
            <p className="text-xl font-bold text-white">{eventoCandidato?.nombre ?? 'Certamen'}</p>
            <p className="text-sm text-gold-400">{eventoCandidato?.etapa ?? ''}</p>
          </div>
        </div>

        {/* Título llamativo */}
        <h1 className="text-5xl font-black leading-tight tracking-tight text-white sm:text-7xl">
          ¡Escanea y vota{' '}
          <span className="bg-linear-to-r from-gold-300 to-gold-500 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(223,191,98,0.35)]">
            por tu favorita!
          </span>
        </h1>

        {/* QR gigante */}
        <div className="rounded-3xl bg-white p-4 shadow-2xl shadow-black/60">
          <img
            src={urlQR}
            alt="QR de votación"
            className="h-[min(58vh,560px)] w-[min(58vh,560px)] rounded-2xl object-contain"
          />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">
            📱 Apunta la cámara de tu celular al código y vota por tu candidata
          </p>
          <p className="text-sm text-navy-300">
            1 voto gratis por dispositivo · Desbloquea más votos con Yape
          </p>
          <code className="text-xs text-navy-500">{urlVotar}</code>
        </div>
      </div>
    </div>
  )
}