export type Category = 'nieuws' | 'wedstrijd' | 'selectie' | 'jeugd' | 'overig';

export interface Bericht {
  id: number;
  title: string;
  content: string;
  category: Category;
  active: boolean;
  image: string | null;
  created_at: string;
  sort_order: number;
}
