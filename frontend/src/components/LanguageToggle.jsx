import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LanguageIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { Listbox, Transition } from '@headlessui/react'
import { useToast } from '../hooks/useToast'

export default function LanguageToggle() {
  const { i18n, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const { addToast } = useToast()
  
  const languages = [
    { 
      code: 'zh', 
      name: '中', 
      flag: '🇨🇳',
      nativeName: '中文'
    },
    { 
      code: 'en', 
      name: 'E', 
      flag: '🇺🇸',
      nativeName: 'English'
    }
  ]
  
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0]

  const handleLanguageChange = async (languageCode) => {
    if (languageCode === i18n.language || isChanging) return
    
    setIsChanging(true)
    setIsOpen(false)
    
    try {
      await i18n.changeLanguage(languageCode)
      
      const targetLanguage = languages.find(lang => lang.code === languageCode)
      addToast(
        t('language.switchSuccess', { 
          language: targetLanguage.nativeName 
        }), 
        'success'
      )
    } catch (error) {
      console.error('Language change failed:', error)
      addToast(t('language.switchFailed'), 'error')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="relative">
      <Listbox value={i18n.language} onChange={handleLanguageChange}>
        <div className="relative">
          <Listbox.Button 
            className={`relative w-full cursor-pointer rounded-lg bg-theme-card dark:bg-gray-700 py-2 pl-3 pr-10 text-left shadow-sm border border-theme dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all duration-200 hover:border-emerald-400 ${
              isChanging ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isChanging}
          >
            <span className="flex items-center">
              <span className={`mr-2 text-lg ${isChanging ? 'animate-pulse' : ''}`}>
                {currentLanguage.flag}
              </span>
              <span className="block truncate text-theme-primary dark:text-theme-secondary">
                {currentLanguage.name}
              </span>
              {isChanging && (
                <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                  {t('language.switching')}
                </span>
              )}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              {isChanging ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
              ) : (
                <ChevronDownIcon
                  className="h-5 w-5 text-gray-400 transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-hidden="true"
                />
              )}
            </span>
          </Listbox.Button>

          <Transition
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-theme-card dark:bg-gray-700 py-1 text-base shadow-lg border border-theme dark:border-gray-600 focus:outline-none sm:text-sm">
              {languages.map((language) => (
                <Listbox.Option
                  key={language.code}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-3 pr-9 ${
                      active
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-theme-primary dark:text-theme-secondary'
                    }`
                  }
                  value={language.code}
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center">
                        <span className="mr-2 text-lg">{language.flag}</span>
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {language.name}
                        </span>
                      </div>

                      {selected && (
                        <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                          <svg
                            className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  )
}