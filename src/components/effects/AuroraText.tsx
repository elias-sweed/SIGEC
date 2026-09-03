import type { CSSProperties, ReactNode } from 'react'

interface AuroraTextProps {
  className?: string
  children: ReactNode
  colors?: string[]
  speed?: number
  style?: CSSProperties
}

export default function AuroraText({
  className = '',
  children,
  colors = ['#dfbf62', '#ecd68f', '#c9a227', '#5f7fae', '#dfbf62'],
  speed = 1.5,
  style,
}: AuroraTextProps) {
  return (
    <span
      className={`bg-clip-text text-transparent animate-aurora-text ${className}`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${colors.join(', ')})`,
        backgroundSize: '200% 200%',
        animationDuration: `${8 / speed}s`,
        ...style,
      }}
    >
      {children}
    </span>
  )
}
