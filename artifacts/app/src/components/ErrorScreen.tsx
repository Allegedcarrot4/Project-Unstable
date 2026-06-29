import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useErrorHandler } from '@/lib/errorContext';
import { generateErrorReport } from '@/lib/errorHandler';

const cardStyle: React.CSSProperties = {
  background: `rgba(var(--rgb-bg-secondary, 17, 17, 17), 0.5)`,
  border: `1px solid var(--t-border, #1e1e1e)`,
  borderRadius: '2px',
};

const buttonStyle: React.CSSProperties = {
  background: 'none',
  border: `1px solid var(--t-border, #1e1e1e)`,
  color: `var(--t-text-muted, rgba(255,255,255,0.3))`,
  padding: '0.55rem 0.9rem',
  fontSize: '0.65rem',
  fontFamily: "'Space Grotesk', sans-serif",
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  borderRadius: '2px',
  transition: 'all 0.2s',
};

export function ErrorScreen() {
  const { currentError, retry } = useErrorHandler();
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!currentError) return null;

  const errorReport = generateErrorReport(currentError);

  const copyErrorReport = async () => {
    try {
      await navigator.clipboard.writeText(errorReport);
      setCopied(true);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Unable to copy error details', error);
    }
  };

  const clearCache = async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(name => caches.delete(name)));
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error('Clear cache failed', error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          background: `var(--t-bg, #0d0d0d)`,
          color: `var(--t-text, #e0e0e0)`,
          minHeight: '100vh',
        }}
        className="fixed inset-0 overflow-auto"
      >
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              background: `rgba(var(--rgb-bg-secondary, 17, 17, 17), 0.3)`,
              borderBottom: `1px solid rgba(255,255,255,0.06)`,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              position: 'sticky',
              top: 0,
              zIndex: 10,
            }}
          >
            <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '0.5rem', borderRadius: '2px', background: 'rgba(235,120,120,0.1)', border: '1px solid rgba(235,120,120,0.2)' }}>
                <AlertCircle style={{ width: '20px', height: '20px', color: 'rgba(235,120,120,0.7)' }} />
              </div>
              <div>
                <h1 style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, color: `var(--t-text, #e0e0e0)`, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Error occurred
                </h1>
                <p style={{ fontSize: '0.62rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: '0.2rem 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {currentError.category}
                </p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', width: '100%', padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
            <div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...cardStyle, padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: 0, marginBottom: '0.5rem', letterSpacing: '0.06em' }}>
                    Something went wrong
                  </h2>
                  <p style={{ fontSize: '1rem', color: `var(--t-text-secondary, rgba(255,255,255,0.55))`, margin: 0, letterSpacing: '0.08em' }}>
                    Unexpected error
                  </p>
                </div>
                <p style={{ color: `var(--t-text, #e0e0e0)`, marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
                  {currentError.message}
                </p>
                {currentError.suggestion && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ ...cardStyle, padding: '1rem', marginBottom: '1.5rem', background: 'rgba(136,200,200,0.05)', borderColor: 'rgba(136,200,200,0.2)' }}>
                    <p style={{ fontSize: '0.65rem', color: 'rgba(176,208,224,0.8)', fontWeight: 600, margin: '0 0 0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      💡 suggestion
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(176,208,224,0.7)', margin: 0, lineHeight: 1.5 }}>
                      {currentError.suggestion}
                    </p>
                  </motion.div>
                )}
                <p style={{ fontSize: '0.75rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0, lineHeight: 1.6 }}>
                  We hit a snag while loading this page. You can retry, go back, or explore other sections below.
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => window.location.reload()} style={{ ...buttonStyle, borderColor: 'rgba(136,200,200,0.5)', color: 'rgba(176,208,224,0.9)' }}>
                  ↻ Retry
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={copyErrorReport} style={buttonStyle}>
                  {copied ? '✓ Copied' : '⧉ Copy details'}
                </motion.button>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ ...cardStyle, padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>
                    Error Details
                  </p>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={copyErrorReport} style={buttonStyle}>
                    {copied ? '✓ Copied' : '⧉ Copy'}
                  </motion.button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '1rem', marginBottom: '1rem', rowGap: '0.75rem' }}>
                  <span style={{ fontSize: '0.72rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Error Type</span>
                  <span style={{ fontSize: '0.72rem', color: `var(--t-text, #e0e0e0)`, fontFamily: 'ui-monospace, monospace' }}>{currentError.category}</span>
                  {currentError.statusCode && (
                    <>
                      <span style={{ fontSize: '0.72rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Status Code</span>
                      <span style={{ fontSize: '0.72rem', color: `var(--t-text, #e0e0e0)`, fontFamily: 'ui-monospace, monospace' }}>{currentError.statusCode}</span>
                    </>
                  )}
                  {currentError.url && (
                    <>
                      <span style={{ fontSize: '0.72rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>URL</span>
                      <span style={{ fontSize: '0.72rem', color: `var(--t-text, #e0e0e0)`, fontFamily: 'ui-monospace, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentError.url}</span>
                    </>
                  )}
                  <span style={{ fontSize: '0.72rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Timestamp</span>
                  <span style={{ fontSize: '0.72rem', color: `var(--t-text, #e0e0e0)`, fontFamily: 'ui-monospace, monospace' }}>{currentError.timestamp.toLocaleString()}</span>
                </div>
                <motion.button whileHover={{ color: 'rgba(136,200,200,0.9)' }} onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, cursor: 'pointer', padding: 0, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.06em' }}>
                  {showTechnicalDetails ? '▼' : '▶'} Technical details
                </motion.button>
                <AnimatePresence>
                  {showTechnicalDetails && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: '1rem', padding: '1rem', borderRadius: '2px', background: 'rgba(0,0,0,0.3)', border: `1px solid var(--t-border, #1e1e1e)` }}>
                      <pre style={{ fontSize: '0.65rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, fontFamily: 'ui-monospace, monospace', overflow: 'auto', maxHeight: '200px', margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>{errorReport}</pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => window.open('/', '_blank')} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>⊕ New Tab</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + T</p>
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => (window.location.href = '/settings')} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>⚙ Settings</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Ctrl + ,</p>
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => (window.location.href = '/games')} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>◇ Games</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + G</p>
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowTechnicalDetails(!showTechnicalDetails)} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>⌗ Details</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + D</p>
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => window.history.back()} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>← Back</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + ←</p>
                </motion.button>
                <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => window.parent.postMessage({ type: "unstable-navigate", action: "navigate", page: "newtab" }, "*")} style={{ ...cardStyle, padding: '1rem', textAlign: 'left', transition: 'all 0.2s' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: '0 0 0.3rem', letterSpacing: '0.06em' }}>⌂ Home</p>
                  <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + H</p>
                </motion.button>
              </motion.div>
            </div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem', position: 'sticky', top: '100px' }}>
              <div style={{ ...cardStyle, padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: '0 0 1rem', fontWeight: 600 }}>
                  Status
                </p>
                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentError.clientOnline ? '#10b981' : '#ef4444' }} />
                      <span style={{ fontSize: '0.65rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Client</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: 0 }}>{currentError.clientOnline ? 'Online' : 'Offline'}</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: currentError.backendStatus === 'online' ? '#10b981' : '#ef4444' }} />
                      <span style={{ fontSize: '0.65rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Backend</span>
                    </div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: 0 }}>{currentError.backendStatus === 'online' ? 'Online' : 'Offline'}</p>
                  </div>
                  {currentError.latency !== undefined && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <Zap style={{ width: '14px', height: '14px', color: `var(--t-text-muted, rgba(255,255,255,0.3))` }} />
                        <span style={{ fontSize: '0.65rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, letterSpacing: '0.06em' }}>Latency</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', fontWeight: 600, color: `var(--t-text, #e0e0e0)`, margin: 0 }}>{currentError.latency}ms</p>
                    </div>
                  )}
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => window.location.reload()} style={{ ...buttonStyle, width: '100%', marginTop: '0.5rem' }}>
                  Refresh
                </motion.button>
              </div>
              <div style={{ ...cardStyle, padding: '1.5rem' }}>
                <p style={{ fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: '0 0 1rem', fontWeight: 600 }}>
                  Need help?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <motion.button whileHover={{ background: 'rgba(255,255,255,0.05)' }} onClick={clearCache} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '0.5rem 0', cursor: 'pointer', color: `var(--t-text, #e0e0e0)` }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, margin: '0 0 0.2rem', color: `var(--t-text, #e0e0e0)` }}>Clear cache</p>
                    <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Alt + K</p>
                  </motion.button>
                  <motion.a whileHover={{ background: 'rgba(255,255,255,0.05)' }} href="https://github.com/issues" target="_blank" rel="noopener noreferrer" style={{ background: 'none', border: 'none', textAlign: 'left', padding: '0.5rem 0', cursor: 'pointer', color: `var(--t-text, #e0e0e0)`, display: 'block', textDecoration: 'none' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, margin: '0 0 0.2rem', color: `var(--t-text, #e0e0e0)` }}>Submit an issue</p>
                    <p style={{ fontSize: '0.6rem', color: `var(--t-text-muted, rgba(255,255,255,0.3))`, margin: 0 }}>Go to GitHub</p>
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
