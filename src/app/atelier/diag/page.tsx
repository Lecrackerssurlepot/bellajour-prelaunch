/* PAGE DE DIAGNOSTIC — TEMPORAIRE, À SUPPRIMER UNE FOIS LE BUG IPHONE RÉGLÉ.
   ────────────────────────────────────────────────────────────────────────
   Elle rend EXACTEMENT la même homepage que /atelier, plus un panneau de
   relevé posé par un <script> inline.

   Pourquoi un script inline et non un composant React : si le bundle plante,
   aucun composant React ne s'affiche — y compris celui qui devait rapporter
   le plantage. Le script inline, lui, s'exécute avant le bundle et survit à
   son échec. C'est la seule façon d'attraper une erreur d'hydratation.

   Le panneau n'utilise AUCUNE variable CSS de la charte : s'il dépendait de
   theme.css, le bug pourrait le masquer aussi. Tout est en style inline. */

import Nav from '../components/Nav'
import S1Hero from '../components/S1Hero'
import S2Collection from '../components/S2Collection'
import S3Method from '../components/S3Method'
import S4Final from '../components/S4Final'
import Footer from '../components/Footer'

export const metadata = { robots: { index: false, follow: false } }

const RELEVE = `
(function(){
  var lignes = [];
  var boite;
  function ecrire(t){ lignes.push(t); if(boite) boite.textContent = lignes.join('\\n'); }

  // 1. Tout ce qui casse, on l'attrape — y compris avant le bundle.
  window.addEventListener('error', function(e){
    ecrire('!! ERREUR: ' + (e.message||'?') + '  @ ' + (e.filename||'?').split('/').pop() + ':' + (e.lineno||'?'));
  }, true);
  window.addEventListener('unhandledrejection', function(e){
    ecrire('!! PROMESSE REJETEE: ' + ((e.reason && e.reason.message) || e.reason || '?'));
  });

  function sup(p, v){ try { return CSS.supports(p, v) ? 'oui' : 'NON'; } catch(_) { return '?'; } }

  document.addEventListener('DOMContentLoaded', function(){
    boite = document.getElementById('bj-releve');
    ecrire('--- NAVIGATEUR ---');
    ecrire(navigator.userAgent);
    ecrire('viewport ' + window.innerWidth + 'x' + window.innerHeight + '  dpr ' + window.devicePixelRatio);
    ecrire('');
    ecrire('--- CSS SUPPORTE ? ---');
    ecrire('dvh .............. ' + sup('height','100dvh'));
    ecrire('aspect-ratio ..... ' + sup('aspect-ratio','2/3'));
    ecrire('isolation ........ ' + sup('isolation','isolate'));
    ecrire('overflow clip .... ' + sup('overflow','clip'));
    ecrire('inset ............ ' + sup('inset','0'));
    ecrire('IntersectionObs .. ' + (typeof IntersectionObserver !== 'undefined' ? 'oui' : 'NON'));
    ecrire('');

    setTimeout(function(){
      ecrire('--- CE QUE LA PAGE RENVOIE ---');
      var scope = document.querySelector('.bj-atelier');
      var hero  = document.querySelector('.at-hero');
      var h1    = document.querySelector('.at-hero h1');
      if(!scope){ ecrire('.bj-atelier ABSENT'); return; }
      var cs = getComputedStyle(scope);
      ecrire('--c-text ......... "' + cs.getPropertyValue('--c-text').trim() + '"');
      ecrire('theme.css charge . ' + (cs.getPropertyValue('--c-void').trim() ? 'oui' : 'NON'));
      if(hero){
        var rh = hero.getBoundingClientRect();
        ecrire('hero ............. ' + Math.round(rh.width) + 'x' + Math.round(rh.height) + ' @y=' + Math.round(rh.top));
      } else ecrire('.at-hero ABSENT');
      if(h1){
        var r = h1.getBoundingClientRect(), c = getComputedStyle(h1);
        ecrire('h1 ............... ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' @y=' + Math.round(r.top));
        ecrire('h1 couleur ....... ' + c.color + '  opacite ' + c.opacity);
        ecrire('h1 police ........ ' + c.fontFamily.slice(0,42));
        var au = document.elementFromPoint(Math.round(r.left + r.width/2), Math.round(r.top + r.height/2));
        ecrire('au centre du h1 .. ' + (au ? au.tagName + (au.className ? '.' + String(au.className).slice(0,30) : '') : 'RIEN'));
      } else ecrire('h1 ABSENT');
      ecrire('');
      ecrire('--- REACT A-T-IL HYDRATE ? ---');
      var b = document.querySelector('.at-nav-cta');
      ecrire('React monte ...... ' + (document.querySelector('[data-reactroot],#__next') || window.next ? 'probable' : 'indetermine'));
      ecrire('sections revelees  ' + document.querySelectorAll('.at-rv.is-in').length + ' / ' + document.querySelectorAll('.at-rv').length);
      ecrire('(si 0 / N apres avoir scrolle : IntersectionObserver ne tourne pas)');
      if(b) ecrire('bouton nav trouve  oui');
    }, 2500);
  });
})();
`

export default function DiagPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RELEVE }} />

      <pre
        id="bj-releve"
        style={{
          position: 'relative',
          zIndex: 2147483647,
          margin: 0,
          padding: '12px',
          background: '#fff',
          color: '#000',
          font: '11px/1.45 ui-monospace, Menlo, monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          borderBottom: '4px solid #d00',
        }}
      >
        Le script de relevé ne s’est pas exécuté — JavaScript est bloqué ou a
        planté avant tout le reste.
      </pre>

      <Nav />
      <S1Hero />
      <S2Collection />
      <S3Method />
      <S4Final />
      <Footer />
    </>
  )
}
