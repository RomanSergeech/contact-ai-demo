const openVkOauthPopup = (returnTo: string) => {
  const url = `${process.env.NEXT_PUBLIC_DOMAIN}/auth/vk/login?returnTo=${encodeURIComponent(returnTo)}&origin=${encodeURIComponent(window.location.origin)}&popup=1`
  const width = 500
  const height = 650
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  window.open(url, 'vk-oauth', `width=${width},height=${height},left=${left},top=${top}`)
}

export { openVkOauthPopup }
