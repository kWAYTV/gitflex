export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 4v16M6 12c0-4 4-6 12-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="6" cy="20" fill="currentColor" r="2" />
      <circle className="fill-primary" cx="18" cy="6" r="2.5" />
    </svg>
  );
}
