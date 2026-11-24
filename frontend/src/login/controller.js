const t = (s) => window.PVI18N.t(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ERR = {
  not_admin: 'That account is not an admin — login not allowed.',
  bad_state: 'Login session expired — please try again.',
  bad_request: 'Login was interrupted — please try again.',
  no_email: 'No verified email was returned by the provider.',
  token_exchange: 'OAuth exchange failed — check the provider configuration.',
  userinfo: 'Could not read your profile from the provider.',
  oauth_failed: 'Sign-in failed — please try again.',
};
const qerr = new URLSearchParams(location.search).get('error');
if (qerr) document.getElementById('err').textContent = ERR[qerr] ? t(ERR[qerr]) : (t('Sign-in failed') + ' (' + qerr + ').');

const LABEL = { google: 'Continue with Google', github: 'Continue with GitHub' };
let lastProviders = null;
function renderProviders(providers) {
  lastProviders = providers;
  const box = document.getElementById('oauth');
  if (!providers.length) {
    box.innerHTML = `<p class="note">${esc(t('No login provider is configured. The deployer must set up Google or GitHub OAuth — see DEPLOY.md.'))}</p>`;
    return;
  }
  box.innerHTML = providers.map((p) => `<a href="/api/auth/${p}/start">${esc(t(LABEL[p]) || p)}</a>`).join('');
}
fetch('/api/auth/providers').then((r) => r.json()).then((cfg) => {
  renderProviders(cfg.providers || []);
}).catch(() => {
  document.getElementById('err').textContent = t('Could not reach the server.');
});

// language switcher (auto-detects the browser language on first visit)
window.PVI18N.mountSelect(document.getElementById('lang'));
window.PVI18N.applyStatic();
document.addEventListener('pvuv:lang', () => {
  window.PVI18N.applyStatic();
  if (lastProviders) renderProviders(lastProviders);
});
