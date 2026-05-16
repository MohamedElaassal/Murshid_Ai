import { PropsWithChildren } from 'react'

import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { useLang } from '../hooks/useLang'

export const AppLayout = ({ children }: PropsWithChildren): JSX.Element => {
  const { lang, setLang, t } = useLang()

  const getLangButtonClass = (value: 'FR' | 'AR' | 'EN'): string =>
    value === lang
      ? 'bg-[#1a5c38] text-white hover:bg-[#1a5c38]'
      : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'

  return (
    <div
      className={`min-h-screen bg-[#f7f6f3] text-slate-900 ${
        lang === 'AR' ? "font-['IBM_Plex_Sans_Arabic']" : "font-['IBM_Plex_Sans']"
      }`}
    >
      <header className="w-full bg-white px-4 py-3 md:px-8 flex items-center justify-between rtl:flex-row-reverse">
        <div className="flex items-center rtl:flex-row-reverse">
          <div className="w-8 h-8 bg-[#1a5c38] rounded-md" />
          <span className="text-[#1a5c38] font-semibold text-base ml-3 rtl:ml-0 rtl:mr-3">
            {t('national_dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          <Button
            type="button"
            variant="outline"
            className={getLangButtonClass('FR')}
            onClick={() => setLang('FR')}
          >
            FR
          </Button>
          <Button
            type="button"
            variant="outline"
            className={getLangButtonClass('AR')}
            onClick={() => setLang('AR')}
          >
            AR
          </Button>
          <Button
            type="button"
            variant="outline"
            className={getLangButtonClass('EN')}
            onClick={() => setLang('EN')}
          >
            EN
          </Button>
        </div>
      </header>
      <Separator />
      {children}
    </div>
  )
}
