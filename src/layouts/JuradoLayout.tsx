import { Outlet } from 'react-router-dom'
import Prism from '../components/effects/Prism'

export default function JuradoLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-950 px-6 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={5.5}
          scale={3.6}
          hueShift={0}
          colorFrequency={1}
          noise={0}
          glow={1}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-125 max-w-3xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.18),transparent)]"
      />
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}