import { useId } from 'react'
import { assetUrl, type Photo } from '../api'

const PAL = [['#EFD3D8', '#F8ECE8'], ['#DDE5D7', '#F3EFE7'], ['#EADBC6', '#F8F0E6'], ['#E6CFD9', '#F5E8EE'], ['#E3DAD0', '#F6F1EC'], ['#D9E0DA', '#F1EEEA']]

/** Ilustração botânica usada enquanto a clínica não envia fotos. */
export function Art({ index = 0 }: { index?: number }) {
  const id = useId().replace(/:/g, '')
  const [a, b] = PAL[index % PAL.length]
  const flip = index % 2 ? 'scale(-1,1) translate(-200,0)' : undefined
  return (
    <svg className="ph" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="200" height="260" fill={`url(#${id})`} />
      <circle cx={index % 2 ? 52 : 150} cy={70 + index * 9} r={38 + index * 3} fill="#fff" opacity=".35" />
      <g transform={flip} fill="none" stroke="rgba(107,58,75,.34)" strokeWidth="1.2" strokeLinecap="round">
        <path d="M118 262 C 112 200, 122 140, 104 70" />
        <path d="M116 220 C 92 214, 80 196, 82 176 C 102 184, 114 200, 116 220Z" />
        <path d="M115 190 C 138 186, 150 168, 148 148 C 128 156, 117 172, 115 190Z" />
        <path d="M112 156 C 90 150, 80 132, 83 114 C 101 122, 111 138, 112 156Z" />
        <path d="M109 124 C 128 118, 136 102, 134 86 C 118 94, 110 108, 109 124Z" />
        <path d="M105 88 C 94 80, 92 66, 97 54 C 106 62, 108 76, 105 88Z" />
      </g>
    </svg>
  )
}

interface FrameProps { photo?: Photo | null; index?: number; arch?: boolean; caption?: string; className?: string; alt?: string }

export function Frame({ photo, index = 0, arch, caption, className = '', alt }: FrameProps) {
  return (
    <div className={`frame ${arch ? 'arch' : ''} ${className}`}>
      {photo ? <img src={assetUrl(photo.url)} alt={alt ?? photo.caption ?? ''} loading="lazy" /> : <Art index={index} />}
      {caption && <div className={`cap ${photo ? '' : 'soft'}`}>{caption}</div>}
    </div>
  )
}
