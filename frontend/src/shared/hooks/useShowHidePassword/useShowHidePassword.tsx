'use client'

import { useState } from 'react'

export const useShowHidePassword = () => {
  const [inputType, setInputType] = useState('password')

  const SvgElement = () => (
    <div
      className="show_hide_password"
      onClick={() => setInputType(prev => prev === 'password' ? 'text' : 'password')}
    >
      {inputType === 'text'
        ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="#808080" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
        : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#808080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="#808080" strokeWidth="2"/>
          </svg>
        )
      }
    </div>
  )

  return { inputType, setInputType, ShowHidePasswordSvgElement: SvgElement }
}
