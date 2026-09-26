export function LandingBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 bottom-0 top-16 z-0 opacity-[0.95] lg:opacity-80"
      style={{
        backgroundImage:
          "linear-gradient(rgba(11, 16, 32, 0.1), rgba(11, 16, 32, 0.1)), url(/images/gates/collage-hero.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
