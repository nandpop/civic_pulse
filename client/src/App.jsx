import React, { useState, useEffect } from 'react';
import CitizenApp from './components/CitizenApp';
import Dashboard from './components/Dashboard';
import { Buildings, DeviceMobile, ShieldCheck } from '@phosphor-icons/react';

export default function App() {
  const [viewMode, setViewMode] = useState('select'); // 'select', 'citizen', 'authority'
  const [refreshFlag, setRefreshFlag] = useState(0);

  const triggerRefresh = () => {
    setRefreshFlag(prev => prev + 1);
  };

  useEffect(() => {
    // If it's a mobile screen, bypass switcher and go straight to citizen view
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setViewMode('citizen');
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (viewMode === 'select') {
    return (
      <div style={{
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: '#EEECE3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: 'radial-gradient(circle at 1px 1px, rgba(30,36,31,.045) 1px, transparent 0) 0 0/24px 24px, #EEECE3'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: '#1E8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px rgba(30,138,79,.3)' }}>
            <Buildings size={24} weight="fill" style={{ color: '#fff' }} />
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.15 }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1E241F', margin: 0, letterSpacing: '-0.4px' }}>Civic Pulse</h1>
            <span style={{ fontSize: '10.5px', color: '#7C8479', fontWeight: 700, letterSpacing: '0.05em' }}>MUNICIPAL & COMMUNITY OPERATIONS</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px', maxWidth: '800px', width: '100%' }}>
          
          {/* Card 1: Citizen View */}
          <div 
            onClick={() => setViewMode('citizen')}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              border: '1.5px solid rgba(30,36,31,0.07)',
              borderRadius: '24px',
              padding: '30px 24px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.03)',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#1E8A4F';
              e.currentTarget.style.boxShadow = '0 15px 35px -10px rgba(30,138,79,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(30,36,31,0.07)';
              e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.03)';
            }}
          >
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#EAF4EC', color: '#1E8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
              <DeviceMobile weight="fill" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E241F', margin: '0 0 10px 0' }}>Citizen Portal</h2>
            <p style={{ fontSize: '13px', color: '#5B655B', lineHeight: 1.45, margin: 0 }}>
              Report local issues, upvote neighborhood reports, and track resolution progress with community points.
            </p>
          </div>

          {/* Card 2: Civic Authority View */}
          <div 
            onClick={() => setViewMode('authority')}
            style={{
              flex: 1,
              backgroundColor: '#fff',
              border: '1.5px solid rgba(30,36,31,0.07)',
              borderRadius: '24px',
              padding: '30px 24px',
              cursor: 'pointer',
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.03)',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = '#1E8A4F';
              e.currentTarget.style.boxShadow = '0 15px 35px -10px rgba(30,138,79,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(30,36,31,0.07)';
              e.currentTarget.style.boxShadow = '0 10px 30px -10px rgba(0,0,0,0.03)';
            }}
          >
            <div style={{ width: '60px', height: '60px', borderRadius: '20px', backgroundColor: '#EAF4EC', color: '#1E8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '20px' }}>
              <ShieldCheck weight="fill" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1E241F', margin: '0 0 10px 0' }}>Civic Authority Portal</h2>
            <p style={{ fontSize: '13px', color: '#5B655B', lineHeight: 1.45, margin: 0 }}>
              Dispatch maintenance crews, monitor SLAs, approve completed jobs with before/after photos, and view ward analytics.
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#F6F4ED'
    }}>
      {viewMode === 'citizen' ? (
        <CitizenApp 
          triggerRefresh={triggerRefresh} 
          refreshFlag={refreshFlag} 
          onSwitchRole={setViewMode} 
        />
      ) : (
        <Dashboard 
          triggerRefresh={triggerRefresh} 
          refreshFlag={refreshFlag} 
          onSwitchRole={setViewMode} 
        />
      )}
    </div>
  );
}
