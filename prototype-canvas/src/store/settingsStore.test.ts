import { beforeEach, describe, expect, it } from 'vitest';
import { useSettings } from './settingsStore';

beforeEach(() => {
  localStorage.clear();
  useSettings.setState({ theme: 'paper', font: 'serif', edges: 'curved' });
});

describe('settingsStore', () => {
  it('defaults to paper / serif / curved', () => {
    const s = useSettings.getState();
    expect([s.theme, s.font, s.edges]).toEqual(['paper', 'serif', 'curved']);
  });

  it('setters update and persist', () => {
    useSettings.getState().setTheme('studio');
    useSettings.getState().setEdges('angular');
    expect(useSettings.getState().theme).toBe('studio');
    expect(localStorage.getItem('atomiser:settings:v1')).toContain('studio');
  });
});
