export function BrandMark() {
  return (
    <svg
      className="brand-mark"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 48 48"
      width="48"
      height="48"
    >
      <rect x="1" y="1" width="46" height="46" rx="14" fill="currentColor" />
      <path d="M12 14h18c4.4 0 8 3.6 8 8v2H20c-4.4 0-8-3.6-8-8v-2Z" fill="#d6f6e9" />
      <path d="M36 34H18c-4.4 0-8-3.6-8-8v-2h18c4.4 0 8 3.6 8 8v2Z" fill="#67d8bd" />
      <path
        d="M24 17h6M18 31h8"
        stroke="#0b302b"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".5"
      />
      <circle cx="35" cy="13" r="3.5" fill="#ffd36b" />
      <circle cx="35" cy="13" r="1.2" fill="#142520" />
    </svg>
  );
}
