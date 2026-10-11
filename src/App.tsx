import { useI18n } from './i18n/context'
import { Auditor } from './ui/Auditor'
import { Footer } from './ui/Footer'
import { Header } from './ui/Header'
import { Hero } from './ui/Hero'
import { Faq, HowItWorks, PrivacyAndLimits, RulesSection } from './ui/Sections'

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
        <Auditor />
        <HowItWorks />
        <RulesSection />
        <PrivacyAndLimits />
        <Faq />
      </main>
      <Footer />
    </>
  )
}
