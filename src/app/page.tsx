import Hero from './Hero'
import ReferralHashRedirect from './components/ReferralHashRedirect'
import StickyVText from './sections/StickyVText'
import StickyJoinCTA from './sections/StickyJoinCTA'
import Anxiete from './sections/Anxiete'
import BrandIntro from './sections/BrandIntro'
import Solution from './sections/Solution'
import Album from './sections/Album'
import FinalWaitlist from './sections/FinalWaitlist'
import FAQ from './sections/FAQ'
import Footer from './sections/Footer'

export default function Page() {
  return (
    <main>
      <ReferralHashRedirect />
      <StickyVText />
      <StickyJoinCTA />

      <div id="hero" data-section="hero" data-theme="light">
        <Hero />
      </div>

      <div id="anxiete"><Anxiete /></div>
      <BrandIntro />
      <div id="solution"><Solution /></div>
      <div id="album"><Album /></div>
      <div id="finalwaitlist"><FinalWaitlist /></div>
      <div id="faq"><FAQ /></div>
      <div id="footer"><Footer /></div>
    </main>
  )
}
