'use client'

import c from './loader.module.scss'

interface Props {
  fullScreen?: boolean
}

const Loader = ({ fullScreen }: Props) => (
  <div className={c.loader} data-fullscreen={fullScreen}>
    <div className={c.spinner} />
  </div>
)

export { Loader }
