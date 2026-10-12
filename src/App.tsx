import { lazy, Suspense } from 'react'
import { useI18n } from './i18n/context'
import { AuditorPlaceholder } from './ui/AuditorPlaceholder'
import { Footer } from './ui/Footer'
import { Header } from './ui/Header'
import { Hero } from './ui/Hero'
import { Faq, HowItWorks, PrivacyAndLimits, RulesSection } from './ui/Sections'

// The editor and the analysis UI are the bulk of the JavaScript; the hero and the text sections paint without them.
const Auditor = lazy(() => import('./ui/Auditor').then((m) => ({ default: m.Auditor })))

export default function App() {
  const { t } = useI18n()
  return (
    <>
      <a href="#tool" className="skip-link">
        {t('skip')}
      </a>
      <Header />
      <main>
        <Hero />
        <Suspense fallback={<AuditorPlaceholder />}>
          <Auditor />
        </Suspense>
        <HowItWorks />
        <RulesSection />
        <PrivacyAndLimits />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
