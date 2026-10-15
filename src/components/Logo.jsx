export default function Logo({ className = "h-8" }) {
  return (
    <img
      src="https://i.ibb.co.com/pB8Sj8VQ/20261015-213020.png"  // ganti sesuai lokasi file
      alt="Comicverse.id"
      className={className}
      loading="eager"
      decoding="async"
    />
  );
}
