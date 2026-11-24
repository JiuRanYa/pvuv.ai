// Brand SVGs are from Gil Barbara's SVG Logos (CC0). The three PNGs are
// the public favicons served by Path of Exile, Yahoo and Yandex.
const files = import.meta.glob('./source-icons/*.{svg,png}', {
  eager: true, import: 'default', query: '?url',
});
const icons = Object.fromEntries(Object.entries(files).map(([path, url]) => [
  path.split('/').pop().split('.')[0], url,
]));
const brands = {
  'google.com':'google', 'youtube.com':'youtube', 'bing.com':'bing', 'duckduckgo.com':'duckduckgo',
  'yandex.com':'yandex', 'pathofexile.com':'pathofexile', 'reddit.com':'reddit', 'com.reddit.frontpage':'reddit',
  'yahoo.com':'yahoo', 'facebook.com':'facebook', 'twitch.tv':'twitch', 'github.com':'github',
  'chatgpt.com':'chatgpt', 'openai.com':'chatgpt', 'perplexity.ai':'perplexity', 'claude.ai':'claude',
  'gemini.google.com':'gemini', 'instagram.com':'instagram', 'linkedin.com':'linkedin',
  'pinterest.com':'pinterest', 'telegram.org':'telegram', 'search.brave.com':'brave',
  'producthunt.com':'producthunt', 'news.ycombinator.com':'hackernews',
};

export function sourceIconUrl(raw, canonical) {
  const key = raw?.toLowerCase() || '(direct)';
  if (key === '(direct)' || key === 'direct') return icons.direct;
  const brand = brands[key] || brands[canonical] || key;
  return Object.hasOwn(icons, brand) ? icons[brand] : icons.referral;
}
