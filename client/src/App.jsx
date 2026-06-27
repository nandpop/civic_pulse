import React from 'react';
import CitizenApp from './components/CitizenApp';

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 20px 64px',
      background: 'radial-gradient(circle at 1px 1px, rgba(30,36,31,.045) 1px, transparent 0) 0 0/24px 24px, #EEECE3'
    }}>
      <CitizenApp />
    </div>
  );
}
