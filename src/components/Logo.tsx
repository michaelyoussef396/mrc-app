import { memo } from 'react'
import logoSmall from '@/assets/logo-small.png'
import logoLarge from '@/assets/logo-large.png'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  variant?: 'light' | 'dark'
  className?: string
}

const Logo = memo(({ size = 'medium', variant = 'dark', className = '' }: LogoProps) => {
  const sizeMap = {
    small: { width: 32, height: 32 },
    medium: { width: 48, height: 48 },
    large: { width: 80, height: 80 }
  }

  const dimensions = sizeMap[size]
  
  // Use small logo for small/medium, large logo for large size
  const logoSrc = size === 'large' ? logoLarge : logoSmall
  
  return (
    <img
      src={logoSrc}
      alt="Mould & Restoration Co."
      width={dimensions.width}
      height={dimensions.height}
      className={`mrc-logo ${className}`}
      style={{
        objectFit: 'contain',
        filter: variant === 'light' ? 'brightness(0) invert(1)' : 'none'
      }}
    />
  )
})

Logo.displayName = 'Logo'

export default Logo
