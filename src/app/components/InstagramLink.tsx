import './instagramlink.css'

interface InstagramLinkProps {
  handle?: string
  href?: string
  className?: string
}

export default function InstagramLink({
  handle = '@bellajour__',
  href = 'https://www.instagram.com/bellajour__/',
  className,
}: InstagramLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`bj-insta${className ? ` ${className}` : ''}`}
      aria-label="Bellajour sur Instagram"
    >
      <svg
        className="bj-insta-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
      </svg>
      <span>{handle}</span>
    </a>
  )
}
