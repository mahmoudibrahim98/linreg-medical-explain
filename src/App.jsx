import { useEffect, useState } from 'react';
import LinearExplainer from './explainers/LinearExplainer';
import LogisticExplainer from './explainers/LogisticExplainer';
import DecisionTreeExplainer from './explainers/DecisionTreeExplainer';

function getRoute() {
  const h = (typeof window !== 'undefined' && window.location.hash) || '';
  if (h.startsWith('#/logistic')) return 'logistic';
  if (h.startsWith('#/tree')) return 'tree';
  return 'linear';
}

function NavLink({ href, route, current, children }) {
  return (
    <a
      href={href}
      className={`nav-link${current === route ? ' active' : ''}`}
    >
      {children}
    </a>
  );
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHash = () => {
      setRoute(getRoute());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="page-shell">
      <nav className="topnav">
        <div className="topnav-inner">
          <span className="topnav-brand">
            <span className="brand-mark" />
            <span className="topnav-brand-text">
              Models in Medicine
              <span className="topnav-brand-byline">by Mahmoud Ibrahim</span>
            </span>
          </span>
          <div className="topnav-links">
            <NavLink href="#/" route="linear" current={route}>
              Linear regression
            </NavLink>
            <NavLink href="#/logistic" route="logistic" current={route}>
              Logistic regression
            </NavLink>
            <NavLink href="#/tree" route="tree" current={route}>
              Decision trees
            </NavLink>
          </div>
        </div>
      </nav>
      {route === 'logistic' ? (
        <LogisticExplainer />
      ) : route === 'tree' ? (
        <DecisionTreeExplainer />
      ) : (
        <LinearExplainer />
      )}
    </div>
  );
}
