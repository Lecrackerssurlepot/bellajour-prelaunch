import type { NextConfig } from "next";

/* ── LES EN-TÊTES DE PROTECTION (T-163, 20/10/2026) ──────────────────────
   Avant ce jour, le site n'envoyait que `strict-transport-security` (posé par
   Vercel). Le risque nommé par le ticket : une page tierce encadre
   `/admin/atelier` pendant que Mathias ou Louis y est connecté, et fait
   cliquer un geste d'écriture (envoi à l'impression, transition). Même chose
   pour l'espace d'une édition, dont le lien circule.

   Ce qui est APPLIQUÉ, sur toutes les adresses :
   - `X-Frame-Options: DENY` et `Content-Security-Policy: frame-ancestors 'none'`
     (le second est la règle moderne, le premier couvre les vieux navigateurs).
     C'est la SEULE directive de CSP appliquée : elle ne touche à aucune
     ressource de la page, elle refuse seulement d'être encadrée ;
   - `X-Content-Type-Options: nosniff` : un fichier servi sous un faux type
     n'est jamais exécuté comme un script ;
   - `Referrer-Policy: strict-origin-when-cross-origin` : un site tiers ne
     reçoit que `https://www.bellajour.fr/`, jamais le chemin. ⚠️ SAUF
     `/edition` et `/depot`, dont les adresses PORTENT UN TOKEN : leurs layouts
     posent déjà `referrer: 'no-referrer'` (balise meta), et l'en-tête dit la
     même chose plus bas, après la règle générale (la dernière gagne) ;
   - `Permissions-Policy` minimale : ni caméra, ni micro, ni position. Aucune
     page ne s'en sert (vérifié le 20/10 : ni `getUserMedia` ni
     `navigator.geolocation` dans `src/`). Le verrou d'écran de `/depot`
     (`screen-wake-lock`) et le presse-papiers ne sont PAS touchés.

   UNE EXCEPTION AU REFUS D'ÊTRE ENCADRÉ, et une seule : l'aperçu du mail
   « Votre espace est prêt » (`/api/admin/collectif/editions/<id>/mail-espace`)
   est montré dans une IFRAME de l'écran « L'édition est créée »
   (`FinCreation.tsx`, qui lit sa hauteur par `contentDocument`). Il est donc
   encadrable par le site lui-même (`SAMEORIGIN`, `frame-ancestors 'self'`),
   par personne d'autre.

   ET UNE CSP COMPLÈTE EN « RAPPORT SEUL » (`Content-Security-Policy-Report-Only`) :
   elle ne bloque RIEN, le navigateur écrit seulement dans sa console ce qu'il
   aurait refusé. Elle recense ce que les pages chargent vraiment, relevé le
   20/10 sur le build servi en local :
   - scripts : les nôtres, plus les scripts EN LIGNE de Next (sans nonce) et de
     `layout.tsx` (`'unsafe-inline'`) ; `'wasm-unsafe-eval'` pour libheif
     (WebAssembly, `public/heic/`, les HEIC de `/depot` sous Chrome) ;
   - styles : les nôtres et les attributs `style` rendus au serveur ;
   - images : les nôtres, `data:` (textures en ligne), `blob:` (aperçus des
     photos choisies), le coffre R2 (vignettes et photos signées) et la photo
     Google du compte (`*.googleusercontent.com`) ;
   - connexions : les nôtres (dont `/_vercel/insights`, même origine) et le
     coffre R2, où le navigateur envoie les photos en PUT signé ;
   - cadres : les nôtres, et `https:` entier, parce que le « PDF feuilletable »
     de `/numero` est une adresse QUELCONQUE collée par l'atelier
     (`maquette_pdf_url`, `estUrlSure`) : aucune liste ne la couvre ;
   - workers : les nôtres (pdf.js, la réduction des photos, libheif).
   Stripe Checkout est une NAVIGATION (`location.href`), Canva et Google Meet
   des liens, Brevo et Geoapify du serveur : aucun n'entre dans la page, aucun
   n'a sa place ici.
   ⚠️ Avant de l'APPLIQUER (renommer l'en-tête en `Content-Security-Policy`),
   relire la console de chaque écran ; et sans point de collecte des rapports
   (aucun `report-uri` aujourd'hui), personne d'autre que celui qui ouvre la
   console ne voit une violation en production. */
const COFFRE_R2 = "https://*.r2.cloudflarestorage.com";

function politiqueRapportSeul(enDeveloppement: boolean, ancetres: "'none'" | "'self'"): string {
  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    /* `next dev` exige `eval` (piles d'appel de React) et sa socket de rechargement. */
    ["script-src", ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", ...(enDeveloppement ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", COFFRE_R2, "https://*.googleusercontent.com"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", COFFRE_R2, ...(enDeveloppement ? ["ws:", "wss:"] : [])]],
    ["frame-src", ["'self'", "https:"]],
    ["worker-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", [ancetres]],
  ];
  return directives.map(([nom, sources]) => `${nom} ${sources.join(" ")}`).join("; ");
}

function entetesDeProtection(enDeveloppement: boolean) {
  return [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Content-Security-Policy-Report-Only", value: politiqueRapportSeul(enDeveloppement, "'none'") },
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  /* Test sur appareil reel (iPhone) via l'IP LAN du Mac.
     Sans cette liste, `next dev` repond 403 a toute requete /_next/* portant
     un en-tete Origin autre que localhost : le HTML arrive, le bundle JS est
     bloque, React n'hydrate jamais. Symptome trompeur — la page s'affiche
     mais aucun bouton ne repond, et les IntersectionObserver ne s'arment pas.
     Cle DEV UNIQUEMENT : elle n'existe pas dans le build de production et
     ne change donc rien pour /preventes en ligne.
     Le motif couvre les IP privees courantes, l'IP du Mac changeant en DHCP. */
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.*', '192.168.0.*', '10.0.0.*'],
  /* ── LE CACHE DES IMAGES (09/09/2026, audit de vitesse) ──────────────
     Vercel sert `public/` en `max-age=14400, must-revalidate` : passé quatre
     heures, CHAQUE image de la page repart en requête conditionnelle avant
     d'être réaffichée. Sur l'accueil c'est une dizaine d'allers-retours pour
     s'entendre répondre « rien n'a changé », et ils sont sur le chemin de
     l'affichage.

     Un jour de fraîcheur, puis trente jours de `stale-while-revalidate` : au
     retour, l'image s'affiche IMMÉDIATEMENT depuis le cache et le navigateur
     va vérifier en arrière-plan, sans rien retenir à l'écran.

     ⚠️ LE PRIX, ET IL EST RÉEL. Ces fichiers n'ont pas de nom versionné : si
     tu remplaces `brand-01.webp` par un autre visuel, quelqu'un qui l'a déjà
     vu peut continuer à voir l'ancien jusqu'à un jour (puis une fois de plus,
     le temps de la revalidation de fond). Pour qu'un remplacement soit visible
     TOUT DE SUITE, changer le NOM du fichier — `brand-01b.webp` — et le lien
     qui le désigne. C'est la contrepartie acceptée le 09/09.
     Les fichiers de `_next/static` ne sont pas concernés : ils portent déjà
     une empreinte dans leur nom, et Vercel les sert en `immutable`. */
  async headers() {
    return [
      {
        source: "/images/:chemin*",
        headers: [
          {
            key: "Cache-Control",
            /* ⚠️ EN DÉVELOPPEMENT, AUCUN CACHE — ajouté le 15/09/2026.
               La règle d'un jour ci-dessous est juste en production, et c'est
               un choix assumé. En local elle est un piège : pendant le
               chantier des visuels, un fichier régénéré SOUS LE MÊME NOM
               continuait d'être servi depuis le cache de Chrome. Mathias a
               cru deux fois qu'une image n'avait pas été remplacée, et une
               capture de vérification a montré l'ancienne version alors que
               le fichier sur disque était le bon.
               Ce n'est pas un contournement : `next dev` ne sert à mesurer ni
               la vitesse ni le cache, et la valeur de production n'est pas
               touchée.

               ⚠️⚠️ CE CACHE S'APPLIQUE AUSSI AUX 404, ET ÇA COÛTE CHER.
               Le 15/09/2026, deux images ont répondu 404 en production
               pendant que les fichiers étaient déployés et valides. La cause :
               j'avais interrogé leurs adresses AVANT que le déploiement ne
               bascule. Elles ont répondu 404, ce motif `/images/:chemin*` a
               posé `max-age=86400` SUR LA RÉPONSE D'ERREUR, et le CDN l'a
               gardée vingt-quatre heures. Le déploiement suivant ne l'a pas
               purgée — vérifié : `x-vercel-cache: HIT`, `age: 1502`.
               `headers()` ne sait pas distinguer un 200 d'un 404 : la règle
               ne peut pas se corriger ici.
               LA RÈGLE DE TRAVAIL EST DONC : ne jamais interroger l'adresse
               d'une image en production avant que son déploiement soit prêt.
               Un seul `curl` suffit à l'empoisonner pour un jour.
               LE REMÈDE, si ça arrive : changer le NOM du fichier, comme dit
               plus haut. C'est ce qui a été fait (600 → 640, 1920 → 1792). */
            value:
              process.env.NODE_ENV === "production"
                ? "public, max-age=86400, stale-while-revalidate=2592000"
                : "no-store, must-revalidate",
          },
        ],
      },

      /* ── LA PROTECTION (T-163), voir en tête de fichier. L'ORDRE COMPTE :
         quand deux règles posent la même clé sur une adresse, Next garde la
         DERNIÈRE. La règle générale vient donc d'abord, ses deux exceptions
         ensuite. Le harnais (`verif-atelier.ts`, « les en-têtes de
         protection ») rejoue cet ordre adresse par adresse.
         ⚠️ `/_vercel/` est EXCLU : ce sont les scripts de la mesure d'audience
         (`Mesure.tsx`), inertes tant que Web Analytics n'est pas activé, et
         ils répondent alors 404 en `text/plain`. Avec `nosniff`, Chrome ajoutait
         à chaque page « Refused to execute script… MIME type ('text/plain') »
         (relevé le 20/10 sur le build local) : une erreur de console de plus
         pour un script qui ne tournait de toute façon pas. Rien à encadrer ni à
         protéger là : des scripts et des balises de mesure. */
      {
        source: "/:chemin((?!_vercel/).*)",
        headers: entetesDeProtection(process.env.NODE_ENV !== "production"),
      },
      /* Les adresses à token : aucun site ne doit recevoir le chemin, même
         réduit. Les layouts le disent déjà par la balise meta ; on ne la
         contredit pas, on la redit. */
      {
        source: "/edition/:chemin*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/depot/:chemin*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      /* L'aperçu du mail, encadré par `FinCreation.tsx` : par le site seul. */
      {
        source: "/api/admin/collectif/editions/:id/mail-espace",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: politiqueRapportSeul(process.env.NODE_ENV !== "production", "'self'"),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      /* « Retrouver mon espace » (T-154) : l'adresse courte qu'écrivent les mails
         des éditions, « bellajour.fr/espace ». Temporaire (307) : la page peut
         déménager sans qu'un navigateur garde l'ancienne cible. */
      { source: "/espace", destination: "/edition/retrouver", permanent: false },
      /* ── L'ANCIENNE ADRESSE DES PAGES LÉGALES (déplacée ici le 09/09/2026) ──
         Avant T-083, les traductions vivaient sur `/cgv?lang=en` ; depuis, elles
         ont leur adresse propre (`/en/cgv`, `/pt/cgv`), et les quatre pages
         françaises redirigeaient les vieux liens EN LEUR SEIN, en lisant
         `searchParams`. C'était la moitié de ce qui rendait les DOUZE routes
         légales dynamiques — 212 ms de réponse contre 77 pour une page figée,
         pour quatre documents qui ne bougent qu'à la réécriture.

         La règle est désormais tranchée ici, avant tout rendu, et pour rien :
         les pages redeviennent statiques, et le vieux lien répond toujours 308.
         Next reporte les paramètres restants — un `?ref=` survit donc à la
         redirection, exactement comme le faisait `legalHref(slug, lang, ref)`.

         ⚠️ SEUL ÉCART DE COMPORTEMENT, et il est cosmétique : la destination
         garde le `?lang=en` d'origine (`/en/cgv?lang=en`), là où l'ancienne
         redirection écrivait une adresse propre. Next reporte les paramètres
         du départ et ne sait pas en retirer un ; la page ignore `lang`, le
         canonical déclaré reste `/en/cgv`, et un moteur ne verra donc jamais
         cette forme. On l'accepte plutôt que de tordre la règle.

         ⚠️ Une 308 se grave dans le cache des navigateurs. Elle l'était déjà
         avant (`permanentRedirect`) : on ne change que l'endroit où elle est
         décidée, pas sa nature.
         ⚠️ Les quatre documents existent dans les trois langues (vérifié le
         09/09) : aucune redirection ne mène à une traduction absente. Si un
         jour un document n'existait plus qu'en français, `resolveDoc` sert le
         français à `/en/<slug>` et `legalLanguages` ne déclare pas le hreflang
         manquant — la page reste juste, elle ne 404 pas. */
      {
        source: "/:slug(cgv|confidentialite|mentions-legales|remboursement|livraison)",
        has: [{ type: "query", key: "lang", value: "(?<langue>en|pt)" }],
        destination: "/:langue/:slug",
        permanent: true,
      },

      /* BASCULE DU 24/08/2026 — la racine EST l'Atelier.
         Le 307 `/` → `/preventes` (bascule du 13 juin) est retiré : la page
         de vente de la prévente reste joignable par son URL, mais elle n'est
         plus la porte d'entrée du site.

         Les deux redirections ci-dessous sont PERMANENTES (308) et ne sont
         pas de la coquetterie : `/atelier` circule déjà dans les mails de
         l'atelier, sur Instagram et dans les liens de preview partagés. Sans
         elles, chaque lien déjà donné devient un 404 et Google repart de zéro
         sur la nouvelle racine au lieu d'hériter de l'ancienne.

         ⚠️ Une 308 est mise en cache par les navigateurs, parfois pour
         longtemps. Ne pas les inverser à la légère : si /atelier devait un
         jour redevenir une page à part entière, les visiteurs déjà passés
         continueraient d'être renvoyés sur `/`. */
      {
        source: "/atelier",
        destination: "/",
        permanent: true,
      },
      {
        source: "/atelier/composer",
        destination: "/composer",
        permanent: true,
      },

      /* RETRAIT DE LA PRÉVENTE — 28/08/2026, décision de Mathias.
         `/preventes`, `/preventes/prix` et `/lancement` ne sont plus servies.
         Leur code est dans `archive/`, hors build (voir archive/preventes/README.md).

         ⚠️ TEMPORAIRES (307), et ce n'est pas une hésitation. Une 308 se grave
         dans le cache des navigateurs, parfois pour des mois : le jour où l'on
         voudrait rouvrir l'une de ces URL, tous les visiteurs déjà passés
         continueraient d'être renvoyés sur `/` sans qu'aucun déploiement n'y
         puisse rien. Ces trois lignes se retirent en dix secondes ; une 308 ne
         se retire pas du navigateur de quelqu'un d'autre.

         ⚠️ Pourquoi une redirection et pas un 410. Les mails déjà partis
         (W6, P1, P2) pointent sur /preventes, et 14 fondateurs peuvent rouvrir
         un vieux message n'importe quand. C'est l'argument que `lib/prevente.ts`
         oppose depuis le début au 404 : « une lectrice perdue pour rien ».
         Elles atterrissent sur l'Atelier, qui est ce qu'on vend aujourd'hui.

         ⚠️ `/preventes/prix` est écrit À PART. Une source `/preventes` ne
         couvre QUE ce chemin exact : sans cette seconde entrée, la page prix
         resterait en ligne toute seule, et personne ne s'en apercevrait — elle
         n'est liée que depuis /preventes.

         ⚠️ Ce qui n'est PAS redirigé, et ne doit pas l'être : `/merci` (les
         fondateurs y reviennent depuis leur mail de confirmation), les pages
         légales, `/ambassadeurs`, `/inviter`, et les routes d'API — les
         remboursements et les crédits de parrainage passent par là. */
      {
        source: "/preventes",
        destination: "/",
        permanent: false,
      },
      {
        source: "/preventes/prix",
        destination: "/",
        permanent: false,
      },
      {
        source: "/lancement",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
