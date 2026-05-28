import Hero from './Hero'
import StickyVText from './sections/StickyVText'
import StickyJoinCTA from './sections/StickyJoinCTA'
import Anxiete from './sections/Anxiete'
import BrandIntro from './sections/BrandIntro'
import Solution from './sections/Solution'
import Album from './sections/Album'
import FinalWaitlist from './sections/FinalWaitlist'
import FAQ from './sections/FAQ'
import Footer from './sections/Footer'
import FpsCounter from './components/FpsCounter'

export default function Page() {
  return (
    <main>
      <FpsCounter />
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
