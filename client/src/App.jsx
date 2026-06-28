import React from 'react';
import CitizenApp from './components/CitizenApp';

export default function App() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      backgroundColor: '#F6F4ED'
    }}>
      <CitizenApp />
    </div>
  );
}
