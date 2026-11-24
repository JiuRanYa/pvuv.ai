import logos from 'virtual:source-logos';
import { Globe, Link2, Search, Swords } from 'lucide-react';

const generic = {
  bing: [Search, '#1986a0'],
  duckduckgo: [Search, '#1986a0'],
  pathofexile: [Swords, '#805f2c'],
  direct: [Link2, '#52647a'],
  referral: [Globe, '#52647a'],
};

const brands = {
  'x.com':'x', 'google.com':'google', 'youtube.com':'youtube', 'bing.com':'bing', 'duckduckgo.com':'duckduckgo',
  'yandex.com':'yandex', 'pathofexile.com':'pathofexile', 'reddit.com':'reddit', 'com.reddit.frontpage':'reddit',
  'yahoo.com':'yahoo', 'facebook.com':'facebook', 'twitch.tv':'twitch', 'github.com':'github',
  'chatgpt.com':'chatgpt', 'openai.com':'chatgpt', 'perplexity.ai':'perplexity', 'claude.ai':'claude',
  'gemini.google.com':'gemini', 'instagram.com':'instagram', 'linkedin.com':'linkedin',
  'pinterest.com':'pinterest', 'telegram.org':'telegram', 'search.brave.com':'brave',
  'producthunt.com':'producthunt', 'news.ycombinator.com':'hackernews',
};

function symbolId(raw, canonical) {
  const key = raw?.toLowerCase() || '(direct)';
  if (key === '(direct)' || key === 'direct') return 'source-direct';
  const name = brands[key] || brands[canonical] || key;
  return 'source-' + ((Object.hasOwn(logos, name) || Object.hasOwn(generic, name)) ? name : 'referral');
}

// The React leaderboard and the existing HTML detail table share these vector definitions.
export function SourceSymbols() {
  return <svg className="source-symbols" aria-hidden="true" focusable="false">
    <defs>
      {Object.entries(logos).map(([name, { viewBox, body, color }]) =>
        <symbol key={name} id={'source-' + name} viewBox={viewBox} color={color}
          dangerouslySetInnerHTML={{ __html: body }} />
      )}
      {Object.entries(generic).map(([name, [Icon, color]]) =>
      <symbol id={'source-' + name} viewBox="0 0 24 24" key={name}>
        <Icon size={24} color={color} strokeWidth={2.4}/>
      </symbol>
    )}</defs>
  </svg>;
}

export function sourceIconView(raw, canonical) {
  return <svg className="source-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <use href={'#' + symbolId(raw, canonical)}/>
  </svg>;
}

export function sourceIconHTML(raw, canonical) {
  return `<svg class="source-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#${symbolId(raw, canonical)}"></use></svg>`;
}
