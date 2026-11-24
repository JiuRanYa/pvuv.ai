import { mount } from '../mount.jsx';
import './page.css';

function LoginPage() {
  return <>
    <div className="card">
      <h1>pvuv.ai</h1>
      <p className="sub" data-i18n="self-hosted analytics · sign in">self-hosted analytics · sign in</p>
      <div className="oauth" id="oauth"></div>
      <div className="err" id="err"></div>
      <div className="langrow"><select id="lang" aria-label="Language"></select></div>
    </div>
  </>;
}

mount(<LoginPage />);
import('./controller.js');
