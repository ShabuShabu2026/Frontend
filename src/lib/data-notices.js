export const earthVisibilityNotice = 'Earth visibility margin is provisional and has not been validated as a 95% uncertainty bound.'
export const isEarthVisibilityNotice = message => typeof message === 'string' && message.trim() === earthVisibilityNotice
