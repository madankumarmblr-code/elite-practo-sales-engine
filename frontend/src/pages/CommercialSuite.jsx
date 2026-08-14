import { useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getToken } from '../api/client';

export default function CommercialSuite() {
  const { can } = useAuth();
  const frameRef = useRef(null);

  useEffect(() => {
    function postToken() {
      const frame = frameRef.current;
      if (!frame?.contentWindow) return;
      const token = getToken();
      if (!token) return;
      frame.contentWindow.postMessage(
        { type: 'practo-sales-auth', token },
        window.location.origin
      );
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'practo-sales-auth-request') {
        postToken();
      }
    }

    window.addEventListener('message', onMessage);
    const timer = setInterval(postToken, 1000);
    postToken();
    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
    };
  }, []);

  if (!can('commercial_suite:read') && !can('*')) {
    return (
      <div className="pulse-page">
        <header className="pulse-head">
          <h1>Commercial Suite</h1>
          <p>You do not have permission to open the Commercial Suite.</p>
        </header>
      </div>
    );
  }

  return (
    <div className="pulse-page pulse-commercial-page">
      <header className="pulse-head">
        <h1>Commercial Suite</h1>
        <p>Prime · Reach · Video proposals with live Google Sheet inventory (auto-synced).</p>
      </header>
      <div className="pulse-card pulse-commercial-embed">
        <iframe
          ref={frameRef}
          title="Practo Enterprise Commercial Suite"
          src="/commercial-suite.html?embed=1"
          className="commercial-suite-frame"
          allow="clipboard-write"
          onLoad={() => {
            const frame = frameRef.current;
            const token = getToken();
            if (frame?.contentWindow && token) {
              frame.contentWindow.postMessage(
                { type: 'practo-sales-auth', token },
                window.location.origin
              );
            }
          }}
        />
      </div>
    </div>
  );
}
