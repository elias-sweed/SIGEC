import { Outlet } from 'react-router-dom'

export default function JuradoLayout() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-950 px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[-10rem] mx-auto h-[500px] max-w-3xl bg-[radial-gradient(closest-side,rgba(201,162,39,0.18),transparent)]"
      />
      <div className="relative w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}