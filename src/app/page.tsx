import Hero from './Hero'
import StickyVText from './sections/StickyVText'
import StickyJoinCTA from './sections/StickyJoinCTA'
import Anxiete from './sections/Anxiete'
import Solution from './sections/Solution'
import Album from './sections/Album'
import FinalWaitlist from './sections/FinalWaitlist'
import FAQ from './sections/FAQ'
import Footer from './sections/Footer'

export default function Page() {
  return (
    <main>
      <StickyVText />
      <StickyJoinCTA />

      <div data-section="hero" data-theme="light">
        <Hero />
      </div>

      <Anxiete />
      <Solution />
      <Album />
      <FinalWaitlist />
      <FAQ />
      <Footer />
    </main>
  )
}
