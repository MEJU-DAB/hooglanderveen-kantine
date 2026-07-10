import '../globals.css';

export default function BeheerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Google Fonts alleen voor beheer — slideshow gebruikt /slideshow.css */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;500;600;700&family=Lato:ital,wght@0,300;0,400;0,700;1,400&family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
      />
      {children}
    </>
  );
}
