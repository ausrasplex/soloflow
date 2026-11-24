// The colour themes every screen shares, and the CSS variables a theme sets on the page.
// Theme ids match the ones the server saves on the person (lilac, ocean, forest, sunset, graphite).
export function themes() {
    const keys = ['bg', 'surface', 'surface2', 'ink', 'muted', 'line', 'hero', 'heroInk', 'heroMuted', 'primary', 'primaryInk', 'a1', 'a2', 'a3', 'onA', 'onAMuted', 'sel', 'base', 'hist'];
    const mk = (a) => { const o = {}; keys.forEach((k, i) => { o[k] = a[i]; }); return o; };
    return {
      lilac: { name: 'Lilac',
        light: mk(['#f1f1f4', '#ffffff', '#f7f7fa', '#1f1c3b', '#6b6985', '#ececf2', '#2b2849', '#ffffff', '#c9c6e6', '#2b2849', '#ffffff', '#b8a5fa', '#fddcb4', '#e8fb4f', '#1f1c3b', '#3b3760', '#7b5cf5', '#a3a1b8', '#2b2849']),
        dark: mk(['#14122a', '#1f1d3a', '#28254a', '#f1f0fb', '#a9a7c2', '#302d52', '#34306a', '#ffffff', '#cfcbf0', '#b8a5fa', '#1f1c3b', '#b8a5fa', '#fddcb4', '#e8fb4f', '#1f1c3b', '#3b3760', '#b8a5fa', '#6d6a8f', '#f1f0fb']) },
      ocean: { name: 'Ocean',
        light: mk(['#eef3f7', '#ffffff', '#f5f8fb', '#12263a', '#5a6b7d', '#e1e9f0', '#12324d', '#ffffff', '#b9cfe3', '#12324d', '#ffffff', '#9fd0f5', '#bfe9e0', '#ffe9a8', '#0f2336', '#2e4a63', '#1f7ae0', '#9aa9b8', '#12324d']),
        dark: mk(['#0d1a26', '#14273a', '#1b3350', '#e9f2fa', '#9db3c7', '#223b54', '#1d4a73', '#ffffff', '#c3dcf0', '#9fd0f5', '#0f2336', '#9fd0f5', '#bfe9e0', '#ffe9a8', '#0f2336', '#2e4a63', '#6db6ff', '#5d7389', '#e9f2fa']) },
      forest: { name: 'Forest',
        light: mk(['#f1f3ee', '#ffffff', '#f6f8f3', '#1d2b22', '#5f6f64', '#e4e9e0', '#23402f', '#ffffff', '#bcd3c3', '#23402f', '#ffffff', '#bfe3b4', '#f3dcb2', '#d8ef9e', '#162419', '#34503f', '#2f8f5b', '#9aab9f', '#23402f']),
        dark: mk(['#101a14', '#17261c', '#1f3427', '#e8f3ea', '#a1b8a8', '#264232', '#24523a', '#ffffff', '#c4dccb', '#bfe3b4', '#162419', '#bfe3b4', '#f3dcb2', '#d8ef9e', '#162419', '#34503f', '#7fd6a0', '#5f7a69', '#e8f3ea']) },
      sunset: { name: 'Sunset',
        light: mk(['#f7f1ee', '#ffffff', '#fbf6f3', '#3a1f1a', '#7a6560', '#f0e4de', '#4a2330', '#ffffff', '#e8c9cc', '#4a2330', '#ffffff', '#ffb8a3', '#ffe0a3', '#f5c6ec', '#3a1f1a', '#5c3a35', '#d9482b', '#b3a19b', '#4a2330']),
        dark: mk(['#1b1113', '#2a1b1e', '#382529', '#fbeee9', '#c4a9a2', '#4a3236', '#6b2d3e', '#ffffff', '#f0cfd2', '#ffb8a3', '#3a1f1a', '#ffb8a3', '#ffe0a3', '#f5c6ec', '#3a1f1a', '#5c3a35', '#ff8f70', '#8c7570', '#fbeee9']) },
      graphite: { name: 'Graphite',
        light: mk(['#f2f2f2', '#ffffff', '#f7f7f7', '#1a1a1a', '#666666', '#e8e8e8', '#222222', '#ffffff', '#bdbdbd', '#222222', '#ffffff', '#d9d9e0', '#e6e0d4', '#cfe0d8', '#1a1a1a', '#3a3a3a', '#4a5fc1', '#aaaaaa', '#222222']),
        dark: mk(['#121212', '#1c1c1c', '#262626', '#eeeeee', '#a0a0a0', '#2e2e2e', '#2f2f2f', '#ffffff', '#c9c9c9', '#e5e5e5', '#1a1a1a', '#d9d9e0', '#e6e0d4', '#cfe0d8', '#1a1a1a', '#3a3a3a', '#8fa2ff', '#666666', '#eeeeee']) }
    };
  }

export function themeVars(themeId, mode) {
  const all = themes();
  const th = (all[themeId] || all.lilac)[mode === 'dark' ? 'dark' : 'light'];
  return Object.keys(th).map((k) => '--' + k + ':' + th[k]).join(';') +
    ';--t1:color-mix(in srgb,var(--a1) 26%,var(--surface))' +
    ';--t2:color-mix(in srgb,var(--a2) 26%,var(--surface))' +
    ';--t3:color-mix(in srgb,var(--a3) 26%,var(--surface))' +
    ';--outline:color-mix(in srgb,var(--ink) 20%,transparent)' +
    ';--trackA:color-mix(in srgb,var(--onA) 18%,transparent)' +
    ';--navOn:color-mix(in srgb,var(--a1) 30%,var(--surface))' +
    ';--selSoft:color-mix(in srgb,var(--sel) 16%,transparent)' +
    ';--danger:' + (mode === 'dark' ? '#ff8f8f' : '#c9352f') +
    ';--dangerSoft:color-mix(in srgb,var(--danger) 14%,transparent)' +
    ';color-scheme:' + (mode === 'dark' ? 'dark' : 'light');
}
