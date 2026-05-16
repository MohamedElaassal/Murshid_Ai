import { useEffect, useMemo, useState } from 'react'

import { translations } from '../translations'
import { Lang, TranslationKey } from '../types'

const applyDocumentLang = (lang: Lang): void => {
  if (typeof document === 'undefined') {
    return
  }

  const html = document.documentElement
  if (lang === 'AR') {
    html.dir = 'rtl'
    html.lang = 'ar'
  } else {
    html.dir = 'ltr'
    html.lang = lang === 'FR' ? 'fr' : 'en'
  }
}

const getInitialLang = (): Lang => {
  if (typeof window === 'undefined') {
    return 'FR'
  }

  const stored = window.localStorage.getItem('mourchid_lang')
  if (stored === 'FR' || stored === 'AR' || stored === 'EN') {
    applyDocumentLang(stored)
    return stored
  }

  applyDocumentLang('FR')
  return 'FR'
}

export const useLang = (): { lang: Lang; setLang: (lang: Lang) => void; t: (key: TranslationKey) => string } => {
  const [lang, setLang] = useState<Lang>(() => getInitialLang())

  useEffect(() => {
    applyDocumentLang(lang)
    window.localStorage.setItem('mourchid_lang', lang)
  }, [lang])

  const t = useMemo(() => {
    return (key: TranslationKey) => translations[lang][key]
  }, [lang])

  return { lang, setLang, t }
}
