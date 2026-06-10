export type Category = 'nieuws' | 'wedstrijd' | 'selectie' | 'jeugd' | 'overig';

export interface Bericht {
  id: number;
  title: string;
  content: string;
  category: Category;
  active: boolean;
  ticker: boolean;
  image: string | null;
  created_at: string;
  sort_order: number;
  duration: number;    // weergaveduur in seconden, default 10
  font_size: number;   // rem override voor bodytekst, 0 = auto-fit
  title_size: number;  // rem override voor titel, 0 = auto-fit
}
