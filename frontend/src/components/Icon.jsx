const paths = {
  bag: 'M6 7h12l2 14H4L6 7Zm3 0V5a3 3 0 0 1 6 0v2',
  user: 'M20 21v-2a7 7 0 0 0-14 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  search: 'm21 21-5-5M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
  menu: 'M4 6h16M4 12h16M4 18h16',
  minus: 'M5 12h14',
  plus: 'M5 12h14M12 5v14',
  check: 'm5 12 4 4L19 6',
  shield: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6',
  leaf: 'M20 4C8 2 2 8 5 16c8 3 14-3 15-12ZM4 21 16 9',
  box: 'm12 3 9 5v9l-9 5-9-5V8l9-5Zm-9 5 9 5 9-5M12 13v9M7 5.8l9 5',
};
export default function Icon({ name, size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  );
}
