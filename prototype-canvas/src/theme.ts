// Design maps for the editor — extracted from the variant-D prototype.
import { BackgroundVariant } from '@xyflow/react';
import type { Status } from './schema';

export type ThemeKey = 'paper' | 'studio';
export type FontKey = 'serif' | 'plex' | 'archivo';
export type EdgeKey = 'curved' | 'angular' | 'straight';
export type Settings = { theme: ThemeKey; font: FontKey; edges: EdgeKey };

export type Theme = {
  label: string;
  app: string; // page / transcript bg
  canvas: string;
  panel: string; // settings panel / constraint bg
  border: string; // pane + panel borders
  card: string; // node + card bg
  cardBorder: string;
  cardShadow: string;
  text: string;
  subtext: string;
  faint: string;
  status: Record<Status, string>;
  accent: string; // everything proposed / primary
  onAccent: string;
  edge: string;
  edgeConstrain: string;
  grid: string;
  gridVariant: BackgroundVariant;
  gridGap: number;
};

export const THEMES: Record<ThemeKey, Theme> = {
  paper: {
    label: 'Paper',
    app: '#faf7f2',
    canvas: '#fdfcf9',
    panel: '#f6f1e8',
    border: '#e7e0d5',
    card: '#ffffff',
    cardBorder: '#e2dccf',
    cardShadow: '2px 2px 0 rgba(28,25,23,0.05)',
    text: '#1c1917',
    subtext: '#78716c',
    faint: '#a8a29e',
    status: { todo: '#78716c', in_progress: '#b45309', done: '#4d7c0f', blocked: '#b91c1c' },
    accent: '#c2410c',
    onAccent: '#ffffff',
    edge: '#c7bda8',
    edgeConstrain: '#d0c5ae',
    grid: '#f1ebdf',
    gridVariant: BackgroundVariant.Lines,
    gridGap: 34,
  },
  studio: {
    label: 'Studio',
    app: '#14141a',
    canvas: '#101014',
    panel: '#16161c',
    border: '#27272a',
    card: '#1b1b22',
    cardBorder: '#3f3f46',
    cardShadow: 'none',
    text: '#f4f4f5',
    subtext: '#a1a1aa',
    faint: '#71717a',
    status: { todo: '#71717a', in_progress: '#38bdf8', done: '#34d399', blocked: '#fb7185' },
    accent: '#fbbf24',
    onAccent: '#18181b',
    edge: '#3f3f46',
    edgeConstrain: '#52525b',
    grid: '#26262e',
    gridVariant: BackgroundVariant.Dots,
    gridGap: 24,
  },
};

export const FONTS: Record<
  FontKey,
  { label: string; display: string; body: string; caption: string; family: string; italicLabels: boolean }
> = {
  serif: {
    label: 'Editorial',
    display: 'font-fraunces',
    body: 'font-serif4',
    caption: 'font-fraunces',
    family: 'Source Serif 4',
    italicLabels: true,
  },
  plex: {
    label: 'IBM Plex',
    display: 'font-plex',
    body: 'font-plex',
    caption: 'font-plexmono',
    family: 'IBM Plex Mono',
    italicLabels: false,
  },
  archivo: {
    label: 'Archivo',
    display: 'font-archivo',
    body: 'font-archivo',
    caption: 'font-archivo',
    family: 'Archivo',
    italicLabels: false,
  },
};

export const EDGES: Record<
  EdgeKey,
  { label: string; rfType: 'default' | 'smoothstep' | 'straight'; preview: string }
> = {
  curved: { label: 'Curved', rfType: 'default', preview: 'M3 17 C13 17 18 5 28 5' },
  angular: { label: 'Angular', rfType: 'smoothstep', preview: 'M3 17 H13 Q15 17 15 15 V7 Q15 5 17 5 H28' },
  straight: { label: 'Straight', rfType: 'straight', preview: 'M3 17 L28 5' },
};

export const DEFAULT_SETTINGS: Settings = { theme: 'paper', font: 'serif', edges: 'curved' };
