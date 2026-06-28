import React, { useState, useEffect, useRef } from 'react';
import { 
  DeviceMobile, 
  MapPin, 
  Sparkle, 
  Crosshair, 
  ArrowLeft, 
  Camera, 
  PaperPlaneTilt, 
  Tag, 
  UsersThree, 
  ShieldCheck, 
  Wrench, 
  CheckCircle, 
  Flag, 
  House, 
  Trophy, 
  Path, 
  Medal, 
  Fire, 
  Eye, 
  Crown,
  HandPointing,
  Plus,
  Buildings
} from '@phosphor-icons/react';

import GoogleMapsContainer from './GoogleMapsContainer';

const C = {
  'Pothole': { c: '#C0603C', b: '#F6E7DF', i: Camera },
  'Streetlight': { c: '#A9801C', b: '#F6EDD2', i: Sparkle },
  'Water': { c: '#357FD6', b: '#E3EDFB', i: Crosshair },
  'Waste': { c: '#1E8A4F', b: '#E3F0E6', i: ShieldCheck },
  'Tree / Park': { c: '#5E8A2E', b: '#ECF2DD', i: Wrench },
  'Other': { c: '#7A6BC0', b: '#ECE7F7', i: Flag }
};

const S = {
  'Reported': { fg: '#9A6516', bg: '#FAEFD8' },
  'Verified': { fg: '#176B3D', bg: '#E3F1E7' },
  'In Progress': { fg: '#2C5D9E', bg: '#E6EEFB' },
  'Resolved': { fg: '#566056', bg: '#ECEAE1' }
};

export default function CitizenApp({ triggerRefresh, refreshFlag }) {
  // Navigation & Data States
  const [screen, setScreen] = useState('home'); // 'home', 'report', 'detail', 'profile'
  const [homeFilter, setHomeFilter] = useState('All');
  const [trackFilter, setTrackFilter] = useState('All Active');
  const [issues, setIssues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // User Profile
  const [user, setUser] = useState({
    name: 'Aarav Kapoor',
    points: 1240,
    reports: 18,
    resolved: 7,
    streak: 6,
    levelName: 'Neighborhood Hero'
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [confirmedMap, setConfirmedMap] = useState({});
  const [toast, setToast] = useState('');
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Report Flow Wizard State
  const [reportStep, setReportStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [aiThinking, setAiThinking] = useState(false);
  const [aiDone, setAiDone] = useState(false);
  const [draftCategory, setDraftCategory] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSev, setDraftSev] = useState('Medium');
  const [draftAddr, setDraftAddr] = useState('B-12, Lajpat Nagar, New Delhi');
  const [selectedCoords, setSelectedCoords] = useState({ lat: 28.5682, lng: 77.2410 });

  const fileInputRef = useRef(null);

  // Initialize and Fetch
  useEffect(() => {
    fetchIssues();
    fetchUser();
    fetchLeaderboard();
  }, [homeFilter, refreshFlag]);

  // Direct navigate-to-detail function (avoids useEffect race condition)
  const openDetail = (id) => {
    setSelectedIssue(null);
    setLoadingDetail(true);
    setSelectedId(id);
    setScreen('detail');
    fetchIssueDetails(id);
  };

  useEffect(() => {
    window.openIssueDetail = openDetail;
    return () => { delete window.openIssueDetail; };
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch(`/api/issues?category=${homeFilter}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setIssues(data);
      }
    } catch (err) {
      console.error('Failed to fetch issues:', err);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/users/me');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data && data.name) {
        setUser(data);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/users/leaderboard');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setLeaderboard(data);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const fetchIssueDetails = async (id) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/issues/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      if (data && data.customId) {
        setSelectedIssue(data);
      }
    } catch (err) {
      console.error('Failed to fetch issue details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Helper styles
  const pillStyle = (status) => {
    const x = S[status] || S['Reported'];
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      color: x.fg,
      backgroundColor: x.bg
    };
  };

  const chipStyle = (cat) => {
    const x = C[cat] || C['Other'];
    return {
      width: '40px',
      height: '40px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: x.c,
      backgroundColor: x.b,
      flexShrink: 0
    };
  };

  const rankStyle = (idx) => ({
    width: '20px',
    textAlign: 'center',
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
    fontSize: '13px',
    color: idx < 3 ? '#1E8A4F' : '#A7AC9F'
  });

  // Timeline events helper
  const renderTimeline = (issue) => {
    if (!issue || !issue.timeline) return null;
    const order = { 'Reported': 0, 'Verified': 1, 'In Progress': 2, 'Resolved': 3 };
    const lvl = order[issue.status] !== undefined ? order[issue.status] : 0;

    const timelineSteps = [
      { label: 'Reported', who: `by ${issue.by} · ${issue.when}`, reach: 0 },
      { label: 'Community verifying', who: `${issue.confirms} neighbors confirmed`, reach: 0 },
      { label: 'Verified by city', who: 'Municipal Corporation of Delhi', reach: 1 },
      { label: 'Crew assigned', who: 'Field team dispatched', reach: 2 },
      { label: 'Resolved', who: 'Issue closed', reach: 3 }
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '16px' }}>
        {timelineSteps.map((step, idx) => {
          const isDone = lvl >= step.reach;
          const isLast = idx === timelineSteps.length - 1;
          return (
            <div key={idx} style={{ display: 'flex', gap: '13px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDone ? '#fff' : '#A7AC9F',
                    backgroundColor: isDone ? '#1E8A4F' : '#EAE8DE'
                  }}
                >
                  {isDone ? <CheckCircle size={16} weight="fill" /> : <CheckCircle size={16} />}
                </div>
                {!isLast && (
                  <div 
                    style={{ 
                      width: '2px', 
                      minHeight: '22px',
                      flex: 1,
                      backgroundColor: isDone ? '#9FCBAE' : '#EAE8DE' 
                    }}
                  />
                )}
              </div>
              <div style={{ paddingBottom: '18px', textAlign: 'left' }}>
                <div 
                  style={{ 
                    fontSize: '13.5px', 
                    fontWeight: 700,
                    color: isDone ? '#1E241F' : '#A7AC9F' 
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: '11.5px', color: '#7C8479', marginTop: '2px' }}>{step.who}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Camera Upload Logic (Real / Fallback Vision API)
  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewImageUrl(URL.createObjectURL(file));
    setAiThinking(true);
    setAiDone(false);

    // Call server AI Vision classification endpoint
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      setAiThinking(false);
      setAiDone(true);
      setDraftCategory(data.category);
      setDraftTitle(data.title);
      setDraftSev(data.severity);
      showToast(`AI Suggestion: ${data.category} (${data.confidence})`);
    } catch (err) {
      console.error(err);
      setAiThinking(false);
      setAiDone(true);
      // Fallback
      setDraftCategory('Pothole');
      setDraftTitle('Large pothole near pedestrian crossing');
      setDraftSev('High');
      showToast('Vision API Fallback mode active.');
    }
  };

  // Submit Issue
  const handleSubmitIssue = async () => {
    const formData = new FormData();
    formData.append('title', draftTitle);
    formData.append('cat', draftCategory);
    formData.append('sev', draftSev);
    formData.append('loc', draftAddr);
    formData.append('lat', selectedCoords.lat);
    formData.append('lng', selectedCoords.lng);
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        body: formData
      });
      const newIssue = await res.json();
      
      showToast('Report submitted! +50 Pulse Points');
      fetchIssues();
      fetchUser();
      openDetail(newIssue.customId);
      
      // Reset form
      setReportStep(1);
      setSelectedFile(null);
      setPreviewImageUrl('');
      setAiDone(false);
      setDraftCategory('');
      setDraftTitle('');
      setDraftSev('Medium');
      
      // Trigger dashboard refresh if open elsewhere
      if (triggerRefresh) triggerRefresh();
    } catch (err) {
      console.error(err);
      showToast('Error submitting report.');
    }
  };

  // Confirm Issue
  const handleConfirmIssue = async () => {
    if (confirmedMap[selectedId]) return;

    try {
      const res = await fetch(`/api/issues/${encodeURIComponent(selectedId)}/confirm`, {
        method: 'POST'
      });
      const data = await res.json();
      
      setConfirmedMap(prev => ({ ...prev, [selectedId]: true }));
      showToast('Thanks for verifying! +10 Points');
      fetchUser();
      fetchIssueDetails(selectedId);
      fetchIssues();
      
      if (triggerRefresh) triggerRefresh();
    } catch (err) {
      console.error(err);
    }
  };
  // State for responsive design
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inline styles
  const phoneBodyStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#F6F4ED',
    display: 'flex',
    flexDirection: 'column'
  };

  const navBtnStyle = (active) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    flex: 1,
    color: active ? '#1E8A4F' : '#A7AC9F',
    outline: 'none'
  });

  const floatBtnStyle = {
    width: '58px',
    height: '58px',
    borderRadius: '20px',
    backgroundColor: '#1E8A4F',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginTop: '-22px',
    boxShadow: '0 10px 22px -6px rgba(30,138,79,.6)',
    flexShrink: 0,
    outline: 'none'
  };

  const navItemStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: 'calc(100% - 32px)',
    margin: '4px 16px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: active ? 'rgba(76, 196, 126, 0.15)' : 'transparent',
    color: active ? '#4CC47E' : '#B2C4B9',
    fontSize: '14.5px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s',
    outline: 'none'
  });

  const getStatusProgress = (status) => {
    const progress = { 'Reported': 25, 'Verified': 50, 'In Progress': 75, 'Resolved': 100 };
    return progress[status] || 25;
  };

  const trackedIssues = trackFilter === 'My Reports' 
    ? issues.filter(i => i.by === 'You') 
    : issues;

  // ----------------- SCREEN RENDERERS -----------------

  const renderHomeContent = () => (
    <div style={{ padding: '8px 18px 110px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 14px', textAlign: 'left' }}>
        <div>
          <div style={{ fontSize: '13px', color: '#7C8479', fontWeight: 600 }}>Good afternoon, {(user?.name || 'Aarav').split(' ')[0]}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '15px', fontWeight: 700, marginTop: '1px' }}>
            <MapPin size={16} weight="fill" style={{ color: '#1E8A4F' }} />
            Lajpat Nagar, Delhi
          </div>
        </div>
        <button 
          onClick={() => setScreen('profile')} 
          style={{ display: 'flex', alignItems: 'center', gap: '7px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', padding: '6px 11px 6px 7px', borderRadius: '999px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(28,33,24,0.05)', outline: 'none' }}
        >
          <span style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#1E8A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
            {(user?.name || 'A')[0]}
          </span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: '12px', color: '#1E241F' }}>{user?.points || 0}</span>
        </button>
      </div>

      {/* AI Smart Digest */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', background: 'linear-gradient(180deg,#E9F4EC,#E3F1E7)', border: '1px solid rgba(30,138,79,0.18)', borderRadius: '16px', padding: '12px 13px', marginBottom: '14px', textAlign: 'left' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '9px', backgroundColor: '#1E8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Sparkle size={16} weight="fill" style={{ color: '#fff' }} />
        </div>
        <div style={{ lineHeight: 1.3 }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#176B3D' }}>Civic Pulse AI · smart digest</div>
          <div style={{ fontSize: '12px', color: '#41624C', marginTop: '2px' }}>2 nearby reports look like the same pothole. Verifying merges them automatically.</div>
        </div>
      </div>

      {/* Map Preview */}
      <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '172px', border: '1px solid rgba(30,36,31,0.08)', boxShadow: '0 4px 16px rgba(28,33,24,0.06)', marginBottom: '8px' }}>
        <GoogleMapsContainer 
          issues={issues}
          interactive={false}
          zoom={13}
        />
        <div style={{ position: 'absolute', left: '12px', top: '12px', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)', padding: '5px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1E8A4F' }} />
          {issues.filter(i => i.status !== 'Resolved').length} open nearby
        </div>
      </div>

      {/* Category Chips */}
      <div className="cpscroll" style={{ display: 'flex', gap: '7px', overflowX: 'auto', padding: '10px 2px 4px', margin: '0 -2px' }}>
        {['All', 'Pothole', 'Streetlight', 'Water', 'Waste'].map((n) => {
          const active = homeFilter === n;
          return (
            <button 
              key={n}
              onClick={() => setHomeFilter(n)}
              style={{
                flexShrink: 0,
                padding: '7px 13px',
                borderRadius: '999px',
                border: `1px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: active ? '#1E8A4F' : '#fff',
                color: active ? '#fff' : '#5B655B',
                whiteSpace: 'nowrap',
                outline: 'none'
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Feed Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 2px 10px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800 }}>Issues near you</div>
        <div style={{ fontSize: '12px', color: '#7C8479', fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{issues.length} shown</div>
      </div>

      {/* Feed Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {issues.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#7C8479' }}>
            No issues reported in this category.
          </div>
        ) : (
          issues.map((issue) => (
            <button 
              key={issue.customId}
              onClick={() => openDetail(issue.customId)}
              style={{ textAlign: 'left', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '13px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', boxShadow: '0 2px 10px rgba(28,33,24,0.04)', width: '100%', outline: 'none' }}
            >
              <div style={chipStyle(issue.cat)}>
                {(() => {
                  const Icon = C[issue.cat]?.i || Flag;
                  return <Icon size={20} weight="fill" />;
                })()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.25, color: '#1E241F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '5px', fontSize: '11.5px', color: '#7C8479', fontWeight: 600 }}>
                  <span>{issue.cat}</span>
                  <span style={{ color: '#CFCDC2' }}>·</span>
                  <span>{issue.dist}</span>
                  <span style={{ color: '#CFCDC2' }}>·</span>
                  <span>{issue.when}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '9px' }}>
                  <span style={pillStyle(issue.status)}>{issue.status}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#41624C', fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>
                    <UsersThree size={13} weight="fill" />
                    {issue.confirms}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const renderReportContent = () => (
    <div style={{ padding: '8px 18px 120px', textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 14px' }}>
        <button 
          onClick={() => {
            if (reportStep > 1) setReportStep(reportStep - 1);
            else setScreen('home');
          }}
          style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
        >
          <ArrowLeft size={16} weight="bold" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>Report an issue</div>
          <div style={{ fontSize: '11.5px', color: '#7C8479', fontWeight: 600 }}>
            Step {reportStep} of 4 · {['Add photo', 'Details', 'Location', 'Review'][reportStep - 1]}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ height: '6px', backgroundColor: '#E5E3D9', borderRadius: '999px', overflow: 'hidden', marginBottom: '18px' }}>
        <div 
          style={{
            height: '100%',
            backgroundColor: '#1E8A4F',
            borderRadius: '999px',
            transition: 'width .3s ease',
            width: `${(reportStep / 4) * 100}%`
          }}
        />
      </div>

      {/* STEP 1: PHOTO */}
      {reportStep === 1 && (
        <div>
          {!selectedFile ? (
            <button 
              onClick={() => fileInputRef.current.click()}
              style={{ width: '100%', border: '2px dashed #BFC6B7', backgroundColor: '#fff', borderRadius: '18px', height: '230px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', outline: 'none' }}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E9F4EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Camera size={30} weight="fill" style={{ color: '#1E8A4F' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Take or upload a photo</div>
              <div style={{ fontSize: '12px', color: '#7C8479', maxWidth: '230px', textAlign: 'center', lineHeight: 1.35 }}>
                A clear photo helps the AI categorize and helps neighbors verify the report.
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoSelect} 
                accept="image/*"
                style={{ display: 'none' }}
              />
            </button>
          ) : (
            <div>
              <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '230px', backgroundColor: '#E4E1D6', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <img 
                  src={previewImageUrl} 
                  alt="preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(22,19,14,0.6)', color: '#fff', fontSize: '10px', fontFamily: "'Space Mono', monospace", padding: '4px 9px', borderRadius: '7px' }}>
                  {selectedFile.name.substring(0, 20)}
                </div>
              </div>

              {aiThinking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '15px', padding: '14px', marginTop: '12px' }}>
                  <div className="animate-spin-slow" style={{ width: '22px', height: '22px', border: '2.5px solid #DDEBE0', borderTopColor: '#1E8A4F', borderRadius: '50%' }} />
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#176B3D' }}>
                    Civic Pulse AI is analyzing the photo<span className="animate-blink">...</span>
                  </div>
                </div>
              )}

              {aiDone && (
                <div style={{ background: 'linear-gradient(180deg,#E9F4EC,#E3F1E7)', border: '1px solid rgba(30,138,79,0.2)', borderRadius: '15px', padding: '14px', marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', fontWeight: 700, color: '#176B3D', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    <Sparkle size={12} weight="fill" />
                    AI Suggestion · Match Picked
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '10px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F6E7DF', color: '#C0603C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      <Camera weight="fill" />
                    </div>
                    <div style={{ lineHeight: 1.2 }}>
                      <div style={{ fontSize: '15px', fontWeight: 800 }}>{draftCategory}</div>
                      <div style={{ fontSize: '12px', color: '#41624C' }}>Road surface · {draftSev} severity</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {reportStep === 2 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#41624C', marginBottom: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Category
            <span style={{ backgroundColor: '#E3F1E7', color: '#176B3D', fontSize: '10px', padding: '2px 7px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Sparkle size={10} weight="fill" /> AI Picked
            </span>
          </div>
          
          {/* Category Grid Selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '18px' }}>
            {Object.keys(C).map((catName) => {
              const active = draftCategory === catName;
              const Icon = C[catName].i;
              return (
                <button 
                  key={catName}
                  onClick={() => setDraftCategory(catName)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '13px 6px',
                    borderRadius: '13px',
                    cursor: 'pointer',
                    backgroundColor: active ? '#EAF4EC' : '#fff',
                    border: `1.5px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                    color: active ? '#1E8A4F' : '#5B655B',
                    outline: 'none'
                  }}
                >
                  <Icon size={20} weight={active ? "fill" : "regular"} />
                  <span style={{ fontSize: '11px', fontWeight: 700 }}>{catName}</span>
                </button>
              );
            })}
          </div>

          {/* Title Input */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#41624C', marginBottom: '7px' }}>Title</div>
          <input 
            type="text" 
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Describe the issue briefly..."
            style={{ width: '100%', border: '1px solid rgba(30,36,31,0.13)', borderRadius: '13px', padding: '13px', fontSize: '14px', fontWeight: 600, backgroundColor: '#fff', marginBottom: '16px', outline: 'none' }}
          />

          {/* Severity Selection */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#41624C', marginBottom: '7px' }}>Severity</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {['Low', 'Medium', 'High'].map((s) => {
              const active = draftSev === s;
              return (
                <button 
                  key={s}
                  onClick={() => setDraftSev(s)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    border: `1.5px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: active ? '#EAF4EC' : '#fff',
                    color: active ? '#176B3D' : '#5B655B',
                    outline: 'none'
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {reportStep === 3 && (
        <div>
          <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '280px', border: '1px solid rgba(30,36,31,0.08)' }}>
            <GoogleMapsContainer 
              selectedLocation={selectedCoords}
              onLocationSelect={(coords) => {
                setSelectedCoords(coords);
                setDraftAddr(`Plot ${Math.floor(Math.random()*100+1)}, Lajpat Nagar, Delhi`);
              }}
              zoom={15}
              interactive={true}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '15px', padding: '14px', marginTop: '12px' }}>
            <MapPin size={20} weight="fill" style={{ color: '#1E8A4F' }} />
            <div style={{ flex: 1, lineHeight: 1.25 }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{draftAddr}</div>
              <div style={{ fontSize: '11.5px', color: '#7C8479' }}>GPS Selected · Click on map to update pin</div>
            </div>
          </div>
        </div>
      )}

      {reportStep === 4 && (
        <div>
          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ height: '140px', backgroundColor: '#E4E1D6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#8A8678' }}>[ ISSUE PHOTO ]</span>
              )}
            </div>
            <div style={{ padding: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
                <div style={chipStyle(draftCategory)}>
                  {(() => {
                    const Icon = C[draftCategory]?.i || Flag;
                    return <Icon size={17} weight="fill" />;
                  })()}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, lineHeight: 1.2 }}>{draftTitle || 'Untitled Issue'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#41624C' }}>
                  <Tag size={16} style={{ color: '#7C8479' }} />
                  {draftCategory} · {draftSev} severity
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#41624C' }}>
                  <MapPin size={16} style={{ color: '#7C8479' }} />
                  {draftAddr}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', backgroundColor: '#E9F4EC', borderRadius: '14px', padding: '12px', marginTop: '12px' }}>
            <UsersThree size={18} weight="fill" style={{ color: '#1E8A4F', marginTop: '1px' }} />
            <div style={{ fontSize: '12px', color: '#41624C', lineHeight: 1.35 }}>
              Your report goes to neighbors to verify, then routes to <b style={{ color: '#176B3D' }}>MCD Public Works</b>. You'll get points upon confirmation.
            </div>
          </div>
        </div>
      )}

      {/* Wizard Nav Button */}
      <div style={{ marginTop: '20px' }}>
        {reportStep === 4 ? (
          <button 
            onClick={handleSubmitIssue}
            style={{ width: '100%', backgroundColor: '#1E8A4F', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(30,138,79,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', outline: 'none' }}
          >
            <PaperPlaneTilt size={16} weight="fill" />
            Submit report
          </button>
        ) : (
          <button 
            onClick={() => {
              if (reportStep === 1 && !aiDone) return;
              setReportStep(reportStep + 1);
            }}
            style={{
              width: '100%',
              backgroundColor: (reportStep === 1 && !aiDone) ? '#C8CCBF' : '#1E8A4F',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: (reportStep === 1 && !aiDone) ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {reportStep === 1 && !aiDone ? 'Add a photo to continue' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );

  const renderDetailContent = () => {
    if (loadingDetail) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '14px', padding: '40px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #E3F0E6', borderTopColor: '#1E8A4F', animation: 'cpSpin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#7C8479' }}>Loading issue…</span>
        </div>
      );
    }
    
    if (!selectedIssue) return null;

    return (
      <div style={{ textAlign: 'left', paddingBottom: '100px' }}>
        
        {/* Photo Area */}
        <div style={{ position: 'relative', height: '210px', backgroundColor: '#EAE8DE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {selectedIssue.imageUrl ? (
            <img src={selectedIssue.imageUrl} alt={selectedIssue.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#8A8678' }}>[ ISSUE PHOTO ]</span>
          )}
          <button 
            onClick={() => setScreen('home')}
            style={{ position: 'absolute', left: '16px', top: '14px', width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.94)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', outline: 'none' }}
          >
            <ArrowLeft size={18} weight="bold" />
          </button>
          <span className="absolute right-[16px] top-[14px]" style={pillStyle(selectedIssue.status)}>
            {selectedIssue.status}
          </span>
        </div>

        {/* Title & Metadata */}
        <div style={{ padding: '16px 18px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px', marginTop: '2px' }}>
            <div style={chipStyle(selectedIssue.cat)}>
              {(() => {
                const Icon = C[selectedIssue.cat]?.i || Flag;
                return <Icon size={20} weight="fill" />;
              })()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.2, color: '#1E241F' }}>{selectedIssue.title}</div>
              <div style={{ fontSize: '12px', color: '#7C8479', fontWeight: 600, marginTop: '3px' }}>
                {selectedIssue.customId} · reported by {selectedIssue.by} · {selectedIssue.when}
              </div>
            </div>
          </div>

          {/* Metrics boxes */}
          <div style={{ display: 'flex', gap: '9px', marginTop: '14px' }}>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '13px', padding: '11px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '18px', fontWeight: 700, color: '#1E8A4F' }}>{selectedIssue.confirms}</div>
              <div style={{ fontSize: '10.5px', color: '#7C8479', fontWeight: 600, marginTop: '1px' }}>CONFIRMATIONS</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '13px', padding: '11px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '18px', fontWeight: 700 }}>{selectedIssue.sev}</div>
              <div style={{ fontSize: '10.5px', color: '#7C8479', fontWeight: 600, marginTop: '1px' }}>SEVERITY</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '13px', padding: '11px', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '18px', fontWeight: 700 }}>{selectedIssue.dist}</div>
              <div style={{ fontSize: '10.5px', color: '#7C8479', fontWeight: 600, marginTop: '1px' }}>AWAY</div>
            </div>
          </div>

          {/* Confirmation Action Button */}
          {!confirmedMap[selectedIssue.customId] ? (
            <button 
              onClick={handleConfirmIssue}
              style={{ width: '100%', marginTop: '13px', backgroundColor: '#1E8A4F', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 16px -6px rgba(30,138,79,0.5)', outline: 'none' }}
            >
              <HandPointing size={16} weight="fill" />
              I've seen this — confirm it
            </button>
          ) : (
            <div style={{ width: '100%', marginTop: '13px', backgroundColor: '#E3F1E7', color: '#176B3D', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justify: 'center', gap: '8px' }}>
              <CheckCircle size={18} weight="fill" />
              You confirmed this issue
            </div>
          )}

          {/* AI Insights Card */}
          <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', backgroundColor: '#F1EFE6', borderRadius: '13px', padding: '12px', marginTop: '13px' }}>
            <Sparkle size={16} weight="fill" style={{ color: '#1E8A4F', marginTop: '1px' }} />
            <div style={{ fontSize: '12px', color: '#5B655B', lineHeight: 1.35 }}>
              <b style={{ color: '#41624C' }}>AI insight:</b> similar issues in this area were resolved in <b>~3.2 days</b>. Verified pothole reports are prioritized for the next paving route.
            </div>
          </div>

          {/* Timeline */}
          <div style={{ fontSize: '14px', fontWeight: 800, margin: '20px 2px 12px' }}>Progress timeline</div>
          {renderTimeline(selectedIssue)}

        </div>
      </div>
    );
  };

  const renderTrackContent = () => (
    <div style={{ padding: '8px 18px 110px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800 }}>Track your reports</div>
        {isMobileView && (
          <button 
            onClick={() => setScreen('home')}
            style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
          >
            <House size={18} />
          </button>
        )}
      </div>

      {/* Toggle filters between My Reports and All Active */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['All Active', 'My Reports'].map((t) => {
          const active = trackFilter === t;
          return (
            <button 
              key={t}
              onClick={() => setTrackFilter(t)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '12px',
                border: `1.5px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,.1)'}`,
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
                backgroundColor: active ? '#EAF4EC' : '#fff',
                color: active ? '#176B3D' : '#5B655B',
                outline: 'none'
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* List of issues to track */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {trackedIssues.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '24px', textAlign: 'center', fontSize: '13px', color: '#7C8479' }}>
            No reports match the selected filter.
          </div>
        ) : (
          trackedIssues.map((issue) => {
            const statusConfig = S[issue.status] || S['Reported'];
            const progressPercent = getStatusProgress(issue.status);
            return (
              <button 
                key={issue.customId}
                onClick={() => openDetail(issue.customId)}
                style={{ textAlign: 'left', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '13px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 2px 10px rgba(28,33,24,0.04)', width: '100%', outline: 'none' }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                  <div style={chipStyle(issue.cat)}>
                    {(() => {
                      const Icon = C[issue.cat]?.i || Flag;
                      return <Icon size={20} weight="fill" />;
                    })()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1.25, color: '#1E241F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '5px', fontSize: '11.5px', color: '#7C8479', fontWeight: 600 }}>
                      <span>{issue.customId}</span>
                      <span style={{ color: '#CFCDC2' }}>·</span>
                      <span>{issue.loc}</span>
                      <span style={{ color: '#CFCDC2' }}>·</span>
                      <span>{issue.when}</span>
                    </div>
                  </div>
                </div>

                {/* Status bar progress line inside the card */}
                <div style={{ width: '100%', marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '11px', fontWeight: 700 }}>
                    <span style={{ color: '#5B655B' }}>Current Status: <b style={{ color: statusConfig.fg }}>{issue.status}</b></span>
                    <span style={{ color: '#7C8479' }}>{progressPercent}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: '#F1EFE6', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: '#1E8A4F', width: `${progressPercent}%`, borderRadius: '999px', transition: 'width 0.3s ease' }} />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderAwardsContent = () => (
    <div style={{ padding: '8px 18px 120px', textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800 }}>Awards & Levels</div>
        {isMobileView && (
          <button 
            onClick={() => setScreen('home')}
            style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
          >
            <House size={18} />
          </button>
        )}
      </div>

      {/* level progression card */}
      <div style={{ background: 'linear-gradient(150deg,#1E8A4F,#15673A)', borderRadius: '20px', padding: '18px', color: '#fff', position: 'relative', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '130px', height: '130px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>
            {(user?.name || 'A')[0]}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>{user.levelName}</div>
            <div style={{ fontSize: '12px', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Medal size={13} weight="fill" />
              Rank #3 in Lajpat Nagar
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '34px', fontWeight: 700, lineHeight: 1 }}>{user.points}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '5px' }}>Points Earned</div>
        </div>
        <div style={{ height: '7px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
          <div 
            style={{
              height: '100%',
              backgroundColor: '#fff',
              borderRadius: '999px',
              transition: 'width .3s ease',
              width: `${Math.min(100, (user.points / 2500) * 100)}%`
            }}
          />
        </div>
        <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '6px' }}>
          {2500 - user.points > 0 ? `${2500 - user.points} pts to City Champion level` : 'Ready for next promotion'}
        </div>
      </div>

      {/* Streak Tracker */}
      <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '15px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E241F' }}>Weekly Streak Tracker</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#E8943A' }}>
            <Fire weight="fill" />
            {user.streak}-Day Active Streak
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
            const active = idx < user.streak;
            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
                <div 
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: active ? '#fff' : '#7C8479',
                    backgroundColor: active ? '#E8943A' : '#EAE8DE'
                  }}
                >
                  {active ? <Fire size={15} weight="fill" /> : day}
                </div>
                <span style={{ fontSize: '10px', color: '#7C8479', fontWeight: 600 }}>{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard Shortcut Button */}
      {isMobileView && (
        <button 
          onClick={() => setScreen('leaderboard')}
          style={{
            width: '100%',
            backgroundColor: '#fff',
            border: '1px solid rgba(30,36,31,0.07)',
            borderRadius: '16px',
            padding: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: '18px',
            boxShadow: '0 2px 8px rgba(28,33,24,0.04)',
            outline: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={20} weight="fill" style={{ color: '#E8943A' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#1E241F' }}>View Neighborhood Leaderboard</span>
          </div>
          <ArrowLeft size={14} weight="bold" style={{ transform: 'rotate(180deg)', color: '#A7AC9F' }} />
        </button>
      )}

      {/* Badges Grid */}
      <div style={{ fontSize: '14px', fontWeight: 800, margin: '20px 2px 11px' }}>Earned Badges</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {[
          { id: 'first_report', name: 'First Report', desc: 'Submitted your first neighborhood issue report.', icon: Flag, earned: true, progress: '1/1' },
          { id: 'eagle_eye', name: 'Eagle Eye', desc: 'Identified and reported 5 high-severity issues.', icon: Eye, earned: true, progress: '5/5' },
          { id: 'streak_7', name: '7-Day Streak', desc: 'Opened the app and checked active reports for 7 consecutive days.', icon: Fire, earned: true, progress: '6/7' },
          { id: 'verified_10', name: 'Verified x10', desc: 'Confirmed the status of 10 neighborhood issues.', icon: ShieldCheck, earned: true, progress: '10/10' },
          { id: 'resolver', name: 'Resolver', desc: 'Helped MCD dispatch crew by verifying resolved issues.', icon: Wrench, earned: false, progress: '0/1' },
          { id: 'top_10', name: 'Top 10%', desc: 'Placed in the top 10% on the Delhi City Leaderboard.', icon: Crown, earned: false, progress: 'Level 4 needed' }
        ].map((b, i) => {
          const Icon = b.icon;
          return (
            <button 
              key={i}
              onClick={() => setSelectedBadge(b)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 6px',
                borderRadius: '15px',
                backgroundColor: b.earned ? '#fff' : '#F1EFE6',
                border: '1px solid rgba(30,36,31,.07)',
                opacity: b.earned ? 1 : 0.65,
                cursor: 'pointer',
                textAlign: 'center',
                outline: 'none'
              }}
            >
              <div 
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: b.earned ? '#fff' : '#A7AC9F',
                  backgroundColor: b.earned ? '#1E8A4F' : '#E2E0D6'
                }}
              >
                <Icon size={22} weight={b.earned ? "fill" : "regular"} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, lineHeight: 1.15, color: '#41624C' }}>{b.name}</div>
            </button>
          );
        })}
      </div>

    </div>
  );

  const renderProfileContent = () => (
    <div style={{ padding: '8px 18px 120px', textAlign: 'left' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 16px' }}>
        <div style={{ fontSize: '17px', fontWeight: 800 }}>Your impact</div>
        {isMobileView && (
          <button 
            onClick={() => setScreen('home')}
            style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
          >
            <House size={18} />
          </button>
        )}
      </div>

      {/* Impact Stats Card */}
      <div style={{ background: 'linear-gradient(150deg,#1E8A4F,#15673A)', borderRadius: '20px', padding: '18px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '130px', height: '130px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '20px', fontWeight: 800 }}>
            {user.name[0]}
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>{user.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Medal size={13} weight="fill" />
              {user.levelName}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '34px', fontWeight: 700, lineHeight: 1 }}>{user.points}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '5px' }}>Pulse points</div>
        </div>
        <div style={{ height: '7px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '999px', marginTop: '12px', overflow: 'hidden' }}>
          <div 
            style={{
              height: '100%',
              backgroundColor: '#fff',
              borderRadius: '999px',
              transition: 'width .3s ease',
              width: `${Math.min(100, (user.points / 2500) * 100)}%`
            }}
          />
        </div>
        <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '6px' }}>
          {2500 - user.points > 0 ? `${2500 - user.points} pts to City Champion` : 'Ready for next promotion'}
        </div>
      </div>

      {/* Counts boxes */}
      <div style={{ display: 'flex', gap: '9px', marginTop: '13px' }}>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '14px', padding: '13px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '18px', fontWeight: 800, color: '#E8943A' }}>
            <Fire weight="fill" />
            {user.streak}
          </div>
          <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 600, marginTop: '2px' }}>day streak</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '14px', padding: '13px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800 }}>{user.reports}</div>
          <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 600, marginTop: '2px' }}>reports</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '14px', padding: '13px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#1E8A4F' }}>{user.resolved}</div>
          <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 600, marginTop: '2px' }}>resolved</div>
        </div>
      </div>

      {/* Badges Grid */}
      <div style={{ fontSize: '14px', fontWeight: 800, margin: '20px 2px 11px' }}>Badges</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
        {[
          { name: 'First Report', icon: Flag, earned: true },
          { name: 'Eagle Eye', icon: Eye, earned: true },
          { name: '7-Day Streak', icon: Fire, earned: true },
          { name: 'Verified x10', icon: ShieldCheck, earned: true },
          { name: 'Resolver', icon: Wrench, earned: false },
          { name: 'Top 10%', icon: Crown, earned: false }
        ].map((b, i) => {
          const Icon = b.icon;
          return (
            <div 
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 6px',
                borderRadius: '15px',
                backgroundColor: b.earned ? '#fff' : '#F1EFE6',
                border: '1px solid rgba(30,36,31,.07)',
                opacity: b.earned ? 1 : 0.55
              }}
            >
              <div 
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: b.earned ? '#fff' : '#A7AC9F',
                  backgroundColor: b.earned ? '#1E8A4F' : '#E2E0D6'
                }}
              >
                <Icon size={22} weight={b.earned ? "fill" : "regular"} />
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, textAlign: 'center', lineHeight: 1.15, color: '#41624C' }}>{b.name}</div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard list */}
      <div style={{ fontSize: '14px', fontWeight: 800, margin: '20px 2px 11px' }}>Neighborhood leaderboard</div>
      <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', overflow: 'hidden', marginBottom: '30px' }}>
        {leaderboard.map((player, idx) => (
          <div 
            key={player?.id || idx} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '11px',
              padding: '11px 13px',
              borderBottom: idx < leaderboard.length - 1 ? '1px solid rgba(30,36,31,0.05)' : 'none',
              backgroundColor: player?.isYou ? '#EAF4EC' : 'transparent'
            }}
          >
            <div style={rankStyle(idx)}>
              {idx + 1}
            </div>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 800,
                backgroundColor: player?.avBg || '#1E8A4F'
              }}
            >
              {player?.initial || 'A'}
            </div>
            <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 700, color: '#1E241F' }}>{player?.name || 'Player'} {player?.isYou && '(You)'}</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#41624C' }}>{player?.points || 0}</div>
          </div>
        ))}
      </div>

    </div>
  );

  const renderLeaderboardContent = () => (
    <div style={{ padding: isMobileView ? '8px 18px 120px' : '0', textAlign: 'left' }}>
      
      {/* Header */}
      {isMobileView && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0 16px' }}>
          <button 
            onClick={() => setScreen('awards')}
            style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
          >
            <ArrowLeft size={16} weight="bold" />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>Leaderboard</div>
            <div style={{ fontSize: '11.5px', color: '#7C8479', fontWeight: 600 }}>Lajpat Nagar contributors</div>
          </div>
        </div>
      )}

      {/* User Standing summary */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'linear-gradient(180deg,#E9F4EC,#E3F1E7)', border: '1px solid rgba(30,138,79,0.15)', borderRadius: '15px', padding: '12px 13px', marginBottom: '16px' }}>
        <Crown size={22} weight="fill" style={{ color: '#1E8A4F', flexShrink: 0 }} />
        <div style={{ fontSize: '12px', color: '#41624C', lineHeight: 1.35 }}>
          You are ranked <b>#3</b> this week. Report 1 more issue to overtake the next competitor!
        </div>
      </div>

      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '10px', margin: '10px 0 20px', padding: '0 8px' }}>
          
          {/* 2nd Place */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 800,
                  backgroundColor: leaderboard[1]?.avBg || '#C0603C',
                  border: '2px solid #C0C0C0',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                {leaderboard[1]?.initial || 'P'}
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#C0C0C0', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>
                2
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E241F', width: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(leaderboard[1]?.name || 'Player').split(' ')[0]}
            </div>
            <div style={{ fontSize: '10px', color: '#7C8479', fontWeight: 600, marginTop: '2px', fontFamily: "'Space Mono', monospace" }}>
              {leaderboard[1]?.points || 0}
            </div>
            <div style={{ width: '100%', height: '55px', background: 'linear-gradient(180deg, #D4D2C9, #C8C6B9)', borderRadius: '10px 10px 0 0', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C8479', fontSize: '18px', fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
              II
            </div>
          </div>

          {/* 1st Place */}
          <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Crown size={20} weight="fill" style={{ color: '#E8943A', position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%) rotate(-10deg)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }} />
              <div 
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 800,
                  backgroundColor: leaderboard[0]?.avBg || '#1E8A4F',
                  border: '3px solid #E8943A',
                  boxShadow: '0 6px 14px rgba(232,148,58,0.25)'
                }}
              >
                {leaderboard[0]?.initial || 'A'}
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', right: '-2px', backgroundColor: '#E8943A', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800 }}>
                1
              </div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E241F', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(leaderboard[0]?.name || 'Player').split(' ')[0]}
            </div>
            <div style={{ fontSize: '11px', color: '#1E8A4F', fontWeight: 700, marginTop: '2px', fontFamily: "'Space Mono', monospace" }}>
              {leaderboard[0]?.points || 0}
            </div>
            <div style={{ width: '100%', height: '75px', background: 'linear-gradient(180deg, #E2DCB9, #CEB777)', borderRadius: '12px 12px 0 0', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A9801C', fontSize: '22px', fontWeight: 800, fontFamily: "'Space Mono', monospace", boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
              I
            </div>
          </div>

          {/* 3rd Place */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <div 
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px',
                  fontWeight: 800,
                  backgroundColor: leaderboard[2]?.avBg || '#A9801C',
                  border: '2px solid #CD7F32',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                }}
              >
                {leaderboard[2]?.initial || 'K'}
              </div>
              <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', backgroundColor: '#CD7F32', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800 }}>
                3
              </div>
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E241F', width: '75px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(leaderboard[2]?.name || 'Player').split(' ')[0]}
            </div>
            <div style={{ fontSize: '10px', color: '#7C8479', fontWeight: 600, marginTop: '2px', fontFamily: "'Space Mono', monospace" }}>
              {leaderboard[2]?.points || 0}
            </div>
            <div style={{ width: '100%', height: '45px', background: 'linear-gradient(180deg, #E3DEC9, #CCA892)', borderRadius: '10px 10px 0 0', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#91533B', fontSize: '16px', fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
              III
            </div>
          </div>

        </div>
      )}

      {/* Leaderboard List (Rank 4+) */}
      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#5B655B', margin: '14px 2px 10px' }}>Rankings</div>
      <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(28,33,24,0.04)' }}>
        {(leaderboard.length > 3 ? leaderboard.slice(3) : leaderboard).map((player, idx) => {
          const actualRank = leaderboard.length > 3 ? idx + 4 : idx + 1;
          return (
            <div 
              key={player?.id || idx} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '12px 14px',
                borderBottom: actualRank < leaderboard.length ? '1px solid rgba(30,36,31,0.05)' : 'none',
                backgroundColor: player?.isYou ? '#EAF4EC' : 'transparent'
              }}
            >
              <div style={rankStyle(actualRank - 1)}>
                {actualRank}
              </div>
              <div 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 800,
                  backgroundColor: player?.avBg || '#1E8A4F'
                }}
              >
                {player?.initial || 'A'}
              </div>
              <div style={{ flex: 1, fontSize: '13.5px', fontWeight: 700, color: '#1E241F' }}>
                {player?.name || 'Player'} {player?.isYou && '(You)'}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px', fontWeight: 700, color: '#41624C' }}>
                {player?.points || 0} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderMapContent = () => (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#F6F4ED', animation: 'cpFadeIn .3s ease' }}>
      {isMobileView && (
        <div style={{ padding: '24px 20px 14px', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', zIndex: 10, borderBottom: '1px solid rgba(30,36,31,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#1E241F', letterSpacing: '-0.3px', flex: 1 }}>Neighborhood Map</h2>
          <button 
            onClick={() => setScreen('home')}
            style={{ width: '36px', height: '36px', borderRadius: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
          >
            <House size={18} />
          </button>
        </div>
      )}
      
      <div style={{ flex: 1, position: 'relative', minHeight: isMobileView ? 'none' : 'calc(100vh - 100px)' }}>
        <GoogleMapsContainer
          issues={issues}
          zoom={14}
          onMarkerClick={(id) => openDetail(id)}
          containerStyle={{ width: '100%', height: '100%' }}
        />
        
        {/* Overlay for quick actions */}
        <div style={{ position: 'absolute', bottom: '24px', left: '20px', right: '20px', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '12px 24px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 10px 25px rgba(28,33,24,0.1)', pointerEvents: 'auto' }}>
            <MapPin size={18} weight="fill" style={{ color: '#1E8A4F' }} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1E241F' }}>{issues.length} Issues nearby</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ----------------- DESKTOP-SPECIFIC CONTENT LAYOUTS -----------------

  const renderDesktopHome = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', alignItems: 'start', textAlign: 'left' }}>
      
      {/* Left Column: Chips & Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['All', 'Pothole', 'Streetlight', 'Water', 'Waste'].map((n) => {
            const active = homeFilter === n;
            return (
              <button 
                key={n}
                onClick={() => setHomeFilter(n)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '999px',
                  border: `1px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 700,
                  backgroundColor: active ? '#1E8A4F' : '#fff',
                  color: active ? '#fff' : '#5B655B',
                  transition: 'all 0.15s',
                  outline: 'none'
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        {/* Feed Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#1E241F', margin: 0 }}>Active Issues in Your Area</h3>
          <span style={{ fontSize: '12px', color: '#7C8479', fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{issues.length} shown</span>
        </div>

        {/* Feed List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {issues.length === 0 ? (
            <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '18px', padding: '40px', textAlign: 'center', fontSize: '14px', color: '#7C8479' }}>
              No issues reported in this category.
            </div>
          ) : (
            issues.map((issue) => (
              <button 
                key={issue.customId}
                onClick={() => openDetail(issue.customId)}
                style={{ 
                  textAlign: 'left', 
                  backgroundColor: '#fff', 
                  border: '1px solid rgba(30,36,31,0.07)', 
                  borderRadius: '18px', 
                  padding: '16px 20px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  gap: '16px', 
                  alignItems: 'center', 
                  boxShadow: '0 2px 10px rgba(28,33,24,0.03)',
                  transition: 'all 0.2s',
                  width: '100%',
                  outline: 'none'
                }}
                className="desktop-feed-card"
              >
                <div style={chipStyle(issue.cat)}>
                  {(() => {
                    const Icon = C[issue.cat]?.i || Flag;
                    return <Icon size={22} weight="fill" />;
                  })()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15.5px', fontWeight: 800, color: '#1E241F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12px', color: '#7C8479', fontWeight: 600 }}>
                    <span style={{ color: '#1E8A4F' }}>{issue.cat}</span>
                    <span style={{ color: '#CFCDC2' }}>·</span>
                    <span>{issue.loc}</span>
                    <span style={{ color: '#CFCDC2' }}>·</span>
                    <span>{issue.when}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <span style={{ ...pillStyle(issue.status), padding: '5px 12px', fontSize: '11.5px' }}>{issue.status}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: '#41624C', fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
                    <UsersThree size={16} weight="fill" />
                    {issue.confirms} upvotes
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Digest & Preview Map */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '20px' }}>
        
        {/* AI Digest */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'linear-gradient(180deg,#E9F4EC,#E3F1E7)', border: '1px solid rgba(30,138,79,0.18)', borderRadius: '20px', padding: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#1E8A4F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkle size={20} weight="fill" style={{ color: '#fff' }} />
          </div>
          <div style={{ lineHeight: 1.4 }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#176B3D' }}>Civic Pulse AI · smart digest</div>
            <div style={{ fontSize: '12.5px', color: '#41624C', marginTop: '4px' }}>2 nearby reports look like the same pothole. Verifying merges them automatically.</div>
          </div>
        </div>

        {/* Map Card */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '20px', padding: '20px', boxShadow: '0 2px 12px rgba(28,33,24,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E241F' }}>Live Issue Map</span>
            <button 
              onClick={() => setScreen('map')} 
              style={{ border: 'none', background: 'none', color: '#1E8A4F', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', outline: 'none' }}
            >
              Expand Map
            </button>
          </div>
          <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', height: '240px', border: '1px solid rgba(30,36,31,0.08)' }}>
            <GoogleMapsContainer 
              issues={issues}
              interactive={false}
              zoom={13}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '14px', fontSize: '12.5px', fontWeight: 700, color: '#1E8A4F' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#1E8A4F' }} />
            {issues.filter(i => i.status !== 'Resolved').length} unresolved issues nearby
          </div>
        </div>
      </div>
    </div>
  );

  const renderDesktopReport = () => (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
      <div style={{ width: '100%', maxWidth: '650px', backgroundColor: '#fff', borderRadius: '24px', border: '1px solid rgba(30,36,31,0.07)', boxShadow: '0 4px 20px rgba(28,33,24,0.04)', padding: '30px' }}>
        
        {/* Step Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', textAlign: 'left' }}>
          {reportStep > 1 && (
            <button 
              onClick={() => setReportStep(reportStep - 1)}
              style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
          )}
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1E241F' }}>Step {reportStep} of 4</h3>
            <span style={{ fontSize: '12.5px', color: '#7C8479', fontWeight: 600 }}>
              {['Upload Issue Photo', 'Provide Details', 'Select Map Location', 'Review and Submit'][reportStep - 1]}
            </span>
          </div>
        </div>

        {/* Progress Line */}
        <div style={{ height: '6px', backgroundColor: '#E5E3D9', borderRadius: '999px', overflow: 'hidden', marginBottom: '26px' }}>
          <div 
            style={{
              height: '100%',
              backgroundColor: '#1E8A4F',
              borderRadius: '999px',
              transition: 'width .3s ease',
              width: `${(reportStep / 4) * 100}%`
            }}
          />
        </div>

        {/* Step Content Card Area */}
        <div style={{ minHeight: '280px', textAlign: 'left' }}>
          {reportStep === 1 && (
            <div>
              {!selectedFile ? (
                <button 
                  onClick={() => fileInputRef.current.click()}
                  style={{ width: '100%', border: '2px dashed #BFC6B7', backgroundColor: '#fff', borderRadius: '20px', height: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', cursor: 'pointer', outline: 'none' }}
                >
                  <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#E9F4EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={32} weight="fill" style={{ color: '#1E8A4F' }} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E241F' }}>Upload a photo of the issue</div>
                  <div style={{ fontSize: '12.5px', color: '#7C8479', maxWidth: '340px', textAlign: 'center', lineHeight: 1.45 }}>
                    Our AI models will automatically try to categorize the issue and set initial parameters.
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoSelect} 
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </button>
              ) : (
                <div>
                  <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '250px', backgroundColor: '#E4E1D6', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <img 
                      src={previewImageUrl} 
                      alt="preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#1E241F' }} 
                    />
                    <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(22,19,14,0.7)', color: '#fff', fontSize: '11px', fontFamily: "'Space Mono', monospace", padding: '4px 9px', borderRadius: '7px' }}>
                      {selectedFile.name.substring(0, 30)}
                    </div>
                  </div>

                  {aiThinking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '15px', padding: '14px', marginTop: '16px' }}>
                      <div className="animate-spin-slow" style={{ width: '22px', height: '22px', border: '2.5px solid #DDEBE0', borderTopColor: '#1E8A4F', borderRadius: '50%' }} />
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#176B3D' }}>
                        Civic Pulse AI is analyzing the photo<span className="animate-blink">...</span>
                      </div>
                    </div>
                  )}

                  {aiDone && (
                    <div style={{ background: 'linear-gradient(180deg,#E9F4EC,#E3F1E7)', border: '1px solid rgba(30,138,79,0.2)', borderRadius: '15px', padding: '14px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11.5px', fontWeight: 700, color: '#176B3D', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        <Sparkle size={12} weight="fill" />
                        AI Analysis Suggested Match
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#F6E7DF', color: '#C0603C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          <Camera weight="fill" />
                        </div>
                        <div style={{ lineHeight: 1.25 }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E241F' }}>{draftCategory}</div>
                          <div style={{ fontSize: '12.5px', color: '#41624C' }}>Road surface obstacle · {draftSev} severity</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {reportStep === 2 && (
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#41624C', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Category Selection
                <span style={{ backgroundColor: '#E3F1E7', color: '#176B3D', fontSize: '10.5px', padding: '2px 8px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkle size={10} weight="fill" /> AI Picked
                </span>
              </div>
              
              {/* Category Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {Object.keys(C).map((catName) => {
                  const active = draftCategory === catName;
                  const Icon = C[catName].i;
                  return (
                    <button 
                      key={catName}
                      onClick={() => setDraftCategory(catName)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '18px 10px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        backgroundColor: active ? '#EAF4EC' : '#fff',
                        border: `1.5px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                        color: active ? '#1E8A4F' : '#5B655B',
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                    >
                      <Icon size={22} weight={active ? "fill" : "regular"} />
                      <span style={{ fontSize: '12px', fontWeight: 700 }}>{catName}</span>
                    </button>
                  );
                })}
              </div>

              {/* Title */}
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#41624C', marginBottom: '8px' }}>Title / Short Description</div>
              <input 
                type="text" 
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Describe the issue briefly..."
                style={{ width: '100%', border: '1px solid rgba(30,36,31,0.13)', borderRadius: '13px', padding: '14px', fontSize: '14.5px', fontWeight: 600, backgroundColor: '#fff', marginBottom: '20px', outline: 'none' }}
              />

              {/* Severity */}
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#41624C', marginBottom: '8px' }}>Severity Level</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['Low', 'Medium', 'High'].map((s) => {
                  const active = draftSev === s;
                  return (
                    <button 
                      key={s}
                      onClick={() => setDraftSev(s)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1.5px solid ${active ? '#1E8A4F' : 'rgba(30,36,31,0.1)'}`,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: active ? '#EAF4EC' : '#fff',
                        color: active ? '#176B3D' : '#5B655B',
                        transition: 'all 0.15s',
                        outline: 'none'
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {reportStep === 3 && (
            <div>
              <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', height: '300px', border: '1px solid rgba(30,36,31,0.08)' }}>
                <GoogleMapsContainer 
                  selectedLocation={selectedCoords}
                  onLocationSelect={(coords) => {
                    setSelectedCoords(coords);
                    setDraftAddr(`Plot ${Math.floor(Math.random()*100+1)}, Lajpat Nagar, Delhi`);
                  }}
                  zoom={15}
                  interactive={true}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '15px', padding: '16px', marginTop: '16px' }}>
                <MapPin size={22} weight="fill" style={{ color: '#1E8A4F' }} />
                <div style={{ flex: 1, lineHeight: 1.3 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{draftAddr}</div>
                  <div style={{ fontSize: '12.5px', color: '#7C8479' }}>GPS Selected Coordinate · Click anywhere on map to reposition search pin</div>
                </div>
              </div>
            </div>
          )}

          {reportStep === 4 && (
            <div>
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.08)', borderRadius: '18px', overflow: 'hidden' }}>
                <div style={{ height: '180px', backgroundColor: '#E4E1D6', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {previewImageUrl ? (
                    <img src={previewImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#1E241F' }} />
                  ) : (
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: '#8A8678' }}>[ NO PHOTO MOUNTED ]</span>
                  )}
                </div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div style={chipStyle(draftCategory)}>
                      {(() => {
                        const Icon = C[draftCategory]?.i || Flag;
                        return <Icon size={18} weight="fill" />;
                      })()}
                    </div>
                    <div>
                      <div style={{ fontSize: '16.5px', fontWeight: 800, color: '#1E241F' }}>{draftTitle || 'Untitled Issue'}</div>
                      <div style={{ fontSize: '12px', color: '#7C8479', marginTop: '2px' }}>{draftCategory} · {draftSev} severity</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', borderTop: '1px solid rgba(30,36,31,0.06)', paddingTop: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#41624C' }}>
                      <MapPin size={18} style={{ color: '#7C8479' }} />
                      {draftAddr}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: '#E9F4EC', borderRadius: '14px', padding: '14px', marginTop: '16px' }}>
                <UsersThree size={20} weight="fill" style={{ color: '#1E8A4F', marginTop: '2px' }} />
                <div style={{ fontSize: '12.5px', color: '#41624C', lineHeight: 1.4 }}>
                  Your report will go live immediately on the neighborhood feed, letting neighbors upvote the issue. Verified issues route instantly to public works.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Action Buttons */}
        <div style={{ marginTop: '26px', display: 'flex', gap: '12px' }}>
          {reportStep === 4 ? (
            <button 
              onClick={handleSubmitIssue}
              style={{ width: '100%', backgroundColor: '#1E8A4F', color: '#fff', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '15px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(30,138,79,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', outline: 'none' }}
            >
              <PaperPlaneTilt size={16} weight="fill" />
              File Report & Alert Authorities
            </button>
          ) : (
            <button 
              onClick={() => {
                if (reportStep === 1 && !aiDone) return;
                setReportStep(reportStep + 1);
              }}
              style={{
                width: '100%',
                backgroundColor: (reportStep === 1 && !aiDone) ? '#C8CCBF' : '#1E8A4F',
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 800,
                cursor: (reportStep === 1 && !aiDone) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
            >
              {reportStep === 1 && !aiDone ? 'Please upload photo to continue' : 'Continue to Next Step'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderDesktopDetail = () => {
    if (loadingDetail) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '14px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #E3F0E6', borderTopColor: '#1E8A4F', animation: 'cpSpin 0.8s linear infinite' }} />
          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#7C8479' }}>Loading issue details…</span>
        </div>
      );
    }

    if (!selectedIssue) return null;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '30px', alignItems: 'start', textAlign: 'left' }}>
        
        {/* Left Side: Photo / Quick Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Back Button and Photo Container */}
          <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', height: '340px', backgroundColor: '#EAE8DE', border: '1px solid rgba(30,36,31,0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
            {selectedIssue.imageUrl ? (
              <img src={selectedIssue.imageUrl} alt={selectedIssue.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                <Camera size={40} style={{ color: '#7C8479' }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '12px', color: '#8A8678' }}>[ NO IMAGE AVAILABLE ]</span>
              </div>
            )}
            <button 
              onClick={() => setScreen('home')}
              style={{ position: 'absolute', left: '16px', top: '16px', width: '38px', height: '38px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.94)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', outline: 'none' }}
            >
              <ArrowLeft size={18} weight="bold" />
            </button>
            <span style={{ ...pillStyle(selectedIssue.status), position: 'absolute', right: '16px', top: '16px', fontSize: '12px', padding: '6px 12px' }}>
              {selectedIssue.status}
            </span>
          </div>

          {/* Metrics Grid */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 10px rgba(28,33,24,0.02)' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 800, color: '#1E8A4F' }}>{selectedIssue.confirms}</div>
              <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 700, marginTop: '4px' }}>CONFIRMATIONS</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 10px rgba(28,33,24,0.02)' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 800 }}>{selectedIssue.sev}</div>
              <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 700, marginTop: '4px' }}>SEVERITY</div>
            </div>
            <div style={{ flex: 1, backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: '0 2px 10px rgba(28,33,24,0.02)' }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 800 }}>{selectedIssue.dist}</div>
              <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 700, marginTop: '4px' }}>AWAY</div>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & Details */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={chipStyle(selectedIssue.cat)}>
              {(() => {
                const Icon = C[selectedIssue.cat]?.i || Flag;
                return <Icon size={22} weight="fill" />;
              })()}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E241F', margin: 0 }}>{selectedIssue.title}</h3>
              <div style={{ fontSize: '12px', color: '#7C8479', fontWeight: 600, marginTop: '4px' }}>
                ID: {selectedIssue.customId} · Reported by {selectedIssue.by} · {selectedIssue.when}
              </div>
            </div>
          </div>

          {/* Location Address */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#F6F4ED', padding: '12px 16px', borderRadius: '14px', marginTop: '18px', fontSize: '13px', fontWeight: 700 }}>
            <MapPin size={18} weight="fill" style={{ color: '#1E8A4F' }} />
            <span>{selectedIssue.loc}</span>
          </div>

          {/* Action upvote button */}
          <div style={{ marginTop: '18px' }}>
            {!confirmedMap[selectedIssue.customId] ? (
              <button 
                onClick={handleConfirmIssue}
                style={{ width: '100%', backgroundColor: '#1E8A4F', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 6px 16px -6px rgba(30,138,79,0.4)', transition: 'background-color 0.15s', outline: 'none' }}
              >
                <HandPointing size={18} weight="fill" />
                I've seen this issue — Confirm to Upvote
              </button>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#E3F1E7', color: '#176B3D', borderRadius: '14px', padding: '14px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', justify: 'center', gap: '8px' }}>
                <CheckCircle size={18} weight="fill" />
                You have successfully confirmed this issue
              </div>
            )}
          </div>

          {/* AI Info Card */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', backgroundColor: '#F1EFE6', borderRadius: '14px', padding: '14px', marginTop: '18px' }}>
            <Sparkle size={18} weight="fill" style={{ color: '#1E8A4F', marginTop: '2px' }} />
            <div style={{ fontSize: '12.5px', color: '#5B655B', lineHeight: 1.4 }}>
              <b style={{ color: '#41624C' }}>AI Analysis:</b> Pothole clusters verified on this street show a standard turnaround time of <b>3.2 days</b>. Upvoting reports helps prompt immediate MCD scheduling.
            </div>
          </div>

          {/* Timeline progress */}
          <div style={{ borderTop: '1px solid rgba(30,36,31,0.06)', marginTop: '24px', paddingTop: '20px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E241F', margin: '0 0 16px' }}>Progress Timeline</h4>
            {renderTimeline(selectedIssue)}
          </div>
        </div>
      </div>
    );
  };

  const renderDesktopAwards = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start', textAlign: 'left' }}>
      
      {/* Left Column: level stats, streak, badges */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* level progression card */}
        <div style={{ background: 'linear-gradient(150deg,#1E8A4F,#15673A)', borderRadius: '20px', padding: '20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '130px', height: '130px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>
              {(user?.name || 'A')[0]}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800 }}>{user.levelName}</div>
              <div style={{ fontSize: '12px', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <Medal size={14} weight="fill" />
                Rank #3 in Lajpat Nagar Area
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '38px', fontWeight: 700, lineHeight: 1 }}>{user.points}</div>
            <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '6px' }}>Points Earned</div>
          </div>
          <div style={{ height: '7px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '999px', marginTop: '14px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                backgroundColor: '#fff',
                borderRadius: '999px',
                transition: 'width .3s ease',
                width: `${Math.min(100, (user.points / 2500) * 100)}%`
              }}
            />
          </div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '8px' }}>
            {2500 - user.points > 0 ? `${2500 - user.points} points needed to rank up to City Champion level` : 'Ready for next promotion'}
          </div>
        </div>

        {/* Streak Tracker */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '18px', padding: '18px', boxShadow: '0 2px 10px rgba(28,33,24,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '14px' }}>
            <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E241F' }}>Weekly Active Streak</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700, color: '#E8943A' }}>
              <Fire weight="fill" />
              {user.streak}-Day Active Streak
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
              const active = idx < user.streak;
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div 
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: active ? '#fff' : '#7C8479',
                      backgroundColor: active ? '#E8943A' : '#EAE8DE'
                    }}
                  >
                    {active ? <Fire size={16} weight="fill" /> : day[0]}
                  </div>
                  <span style={{ fontSize: '11px', color: '#7C8479', fontWeight: 600 }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Badges */}
        <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '18px', padding: '20px', boxShadow: '0 2px 10px rgba(28,33,24,0.02)' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#1E241F', margin: '0 0 16px' }}>Earned Badges</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            {[
              { id: 'first_report', name: 'First Report', desc: 'Submitted your first neighborhood issue report.', icon: Flag, earned: true, progress: '1/1' },
              { id: 'eagle_eye', name: 'Eagle Eye', desc: 'Identified and reported 5 high-severity issues.', icon: Eye, earned: true, progress: '5/5' },
              { id: 'streak_7', name: '7-Day Streak', desc: 'Opened the app and checked active reports for 7 consecutive days.', icon: Fire, earned: true, progress: '6/7' },
              { id: 'verified_10', name: 'Verified x10', desc: 'Confirmed the status of 10 neighborhood issues.', icon: ShieldCheck, earned: true, progress: '10/10' },
              { id: 'resolver', name: 'Resolver', desc: 'Helped MCD dispatch crew by verifying resolved issues.', icon: Wrench, earned: false, progress: '0/1' },
              { id: 'top_10', name: 'Top 10%', desc: 'Placed in the top 10% on the Delhi City Leaderboard.', icon: Crown, earned: false, progress: 'Level 4 needed' }
            ].map((b, i) => {
              const Icon = b.icon;
              return (
                <button 
                  key={i}
                  onClick={() => setSelectedBadge(b)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px 8px',
                    borderRadius: '16px',
                    backgroundColor: b.earned ? '#fff' : '#F1EFE6',
                    border: '1px solid rgba(30,36,31,.07)',
                    opacity: b.earned ? 1 : 0.7,
                    cursor: 'pointer',
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => b.earned && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => b.earned && (e.currentTarget.style.transform = 'none')}
                >
                  <div 
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: b.earned ? '#fff' : '#A7AC9F',
                      backgroundColor: b.earned ? '#1E8A4F' : '#E2E0D6'
                    }}
                  >
                    <Icon size={24} weight={b.earned ? "fill" : "regular"} />
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#41624C' }}>{b.name}</div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: Leaderboard details */}
      <div style={{ backgroundColor: '#fff', border: '1px solid rgba(30,36,31,0.07)', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#1E241F', margin: 0 }}>Neighborhood Leaderboard</h4>
          <span style={{ fontSize: '11px', color: '#1E8A4F', fontWeight: 700, backgroundColor: '#E3F1E7', padding: '4px 10px', borderRadius: '999px' }}>Lajpat Nagar</span>
        </div>
        {renderLeaderboardContent()}
      </div>

    </div>
  );

  // ----------------- DYNAMIC VIEW RENDER SELECTION -----------------

  const renderMobileView = () => (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      backgroundColor: '#F6F4ED',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Content Area */}
      <div className="cpscroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {screen === 'home' && renderHomeContent()}
        {screen === 'report' && renderReportContent()}
        {screen === 'detail' && renderDetailContent()}
        {screen === 'track' && renderTrackContent()}
        {screen === 'awards' && renderAwardsContent()}
        {screen === 'profile' && renderProfileContent()}
        {screen === 'leaderboard' && renderLeaderboardContent()}
        {screen === 'map' && renderMapContent()}
      </div>

      {/* Tab Navigation Bar */}
      {screen !== 'report' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '84px', backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(14px)', borderTop: '1px solid rgba(30,36,31,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 14px 14px', zIndex: 30 }}>
          <button 
            onClick={() => setScreen('home')}
            style={navBtnStyle(screen === 'home')}
          >
            <House size={22} weight={screen === 'home' ? 'fill' : 'regular'} />
            <span style={{ fontSize: '10px', fontWeight: 700 }}>Home</span>
          </button>

          <button 
            onClick={() => setScreen('track')}
            style={navBtnStyle(screen === 'track' || screen === 'detail')}
          >
            <Path size={22} weight={(screen === 'track' || screen === 'detail') ? 'fill' : 'regular'} />
            <span style={{ fontSize: '10px', fontWeight: 700 }}>Track</span>
          </button>

          {/* Floating Report Button */}
          <button 
            onClick={() => {
              setReportStep(1);
              setScreen('report');
            }}
            style={floatBtnStyle}
          >
            <Plus size={26} weight="bold" style={{ color: '#fff' }} />
          </button>

          <button 
            onClick={() => setScreen('awards')}
            style={navBtnStyle(screen === 'awards' || screen === 'leaderboard')}
          >
            <Trophy size={22} weight={(screen === 'awards' || screen === 'leaderboard') ? 'fill' : 'regular'} />
            <span style={{ fontSize: '10px', fontWeight: 700 }}>Awards</span>
          </button>

          <button 
            onClick={() => setScreen('map')}
            style={navBtnStyle(screen === 'map')}
          >
            <MapPin size={22} weight={screen === 'map' ? 'fill' : 'regular'} />
            <span style={{ fontSize: '10px', fontWeight: 700 }}>Map</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderDesktopView = () => (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100vh',
      backgroundColor: '#F6F4ED',
      overflow: 'hidden'
    }}>
      
      {/* Left Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: '#1E241F',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        textAlign: 'left'
      }}>
        
        {/* Brand */}
        <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Buildings size={26} weight="fill" style={{ color: '#1E8A4F' }} />
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Civic Pulse</h1>
            <span style={{ fontSize: '10px', color: '#829C8B', fontWeight: 700, letterSpacing: '0.05em' }}>CITIZEN PORTAL</span>
          </div>
        </div>

        {/* User Card */}
        <button 
          onClick={() => setScreen('profile')}
          style={{
            margin: '20px',
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'left',
            cursor: 'pointer',
            color: 'inherit',
            outline: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1E8A4F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800 }}>
              {user?.initial || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: '#829C8B', fontWeight: 600, marginTop: '2px' }}>{user?.levelName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
            <div>
              <div style={{ color: '#829C8B', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Points</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{user?.points}</div>
            </div>
            <div>
              <div style={{ color: '#829C8B', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Streak</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Fire size={13} weight="fill" style={{ color: '#E8943A' }} /> {user?.streak}d
              </div>
            </div>
            <div>
              <div style={{ color: '#829C8B', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Reports</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px', marginTop: '2px' }}>{user?.reports}</div>
            </div>
          </div>
        </button>

        {/* Sidebar Nav links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button 
            onClick={() => setScreen('home')} 
            style={navItemStyle(screen === 'home')}
          >
            <House size={20} weight={screen === 'home' ? 'fill' : 'regular'} />
            <span>Home Feed</span>
          </button>
          
          <button 
            onClick={() => setScreen('track')} 
            style={navItemStyle(screen === 'track' || screen === 'detail')}
          >
            <Path size={20} weight={(screen === 'track' || screen === 'detail') ? 'fill' : 'regular'} />
            <span>Track Issues</span>
          </button>

          <button 
            onClick={() => setScreen('awards')} 
            style={navItemStyle(screen === 'awards' || screen === 'leaderboard')}
          >
            <Trophy size={20} weight={(screen === 'awards' || screen === 'leaderboard') ? 'fill' : 'regular'} />
            <span>Awards & Badges</span>
          </button>

          <button 
            onClick={() => setScreen('map')} 
            style={navItemStyle(screen === 'map')}
          >
            <MapPin size={20} weight={screen === 'map' ? 'fill' : 'regular'} />
            <span>Interactive Map</span>
          </button>
        </div>

        {/* Quick Report issue button */}
        <div style={{ padding: '20px 16px' }}>
          <button 
            onClick={() => {
              setReportStep(1);
              setScreen('report');
            }}
            style={{
              width: '100%',
              backgroundColor: '#1E8A4F',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 6px 16px -6px rgba(30,138,79,0.5)',
              transition: 'background-color 0.2s',
              outline: 'none'
            }}
          >
            <Plus size={16} weight="bold" />
            Report an Issue
          </button>
        </div>

        {/* Sidebar Footer */}
        <div style={{ marginTop: 'auto', padding: '24px 20px', fontSize: '9.5px', color: '#637C6D', fontWeight: 700, letterSpacing: '0.05em', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          MUNICIPAL CORPORATION OF DELHI
        </div>
      </div>

      {/* Right Content Panel */}
      <div style={{
        flex: 1,
        height: '100vh',
        overflowY: screen === 'map' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* Desk Header */}
        <div style={{ 
          padding: '18px 30px', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid rgba(30,36,31,0.06)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          zIndex: 10,
          flexShrink: 0,
          textAlign: 'left'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E241F', margin: 0, letterSpacing: '-0.3px' }}>
              {screen === 'home' && "Neighborhood Feed"}
              {screen === 'report' && "File a New Report"}
              {screen === 'detail' && "Issue Detail View"}
              {screen === 'track' && "Track Issues"}
              {screen === 'awards' && "Awards & Badges"}
              {screen === 'profile' && "Your Impact & Profile"}
              {screen === 'leaderboard' && "Neighborhood Leaderboard"}
              {screen === 'map' && "Interactive GIS Map"}
            </h2>
            <div style={{ fontSize: '11px', color: '#7C8479', fontWeight: 600, marginTop: '2px' }}>
              {screen === 'home' && "Explore reported issues and upvote local problems near Lajpat Nagar"}
              {screen === 'report' && "Go through the steps to alert the municipality of street issues"}
              {screen === 'detail' && "View verification progress and timeline steps for this issue"}
              {screen === 'track' && "Check on the status of your reports and active community issues"}
              {screen === 'awards' && "Check level progression, streaks, and locked/earned badges"}
              {screen === 'profile' && "A summary of your points, streak, and reported/resolved issues"}
              {screen === 'leaderboard' && "See the top neighborhood contributors and their standing"}
              {screen === 'map' && "Live visualization of local issues and nearby reported problems"}
            </div>
          </div>
        </div>

        {/* Desk Body Content Area */}
        <div style={{ flex: 1, padding: screen === 'map' ? 0 : '30px', display: 'flex', justifyContent: 'center', overflowY: screen === 'map' ? 'hidden' : 'auto' }}>
          <div style={{ 
            width: '100%', 
            maxWidth: screen === 'map' ? 'none' : '1000px',
            animation: 'cpFadeIn .3s ease' 
          }}>
            {screen === 'home' && renderDesktopHome()}
            {screen === 'report' && renderDesktopReport()}
            {screen === 'detail' && renderDesktopDetail()}
            {screen === 'track' && renderTrackContent()}
            {screen === 'awards' && renderDesktopAwards()}
            {screen === 'profile' && renderProfileContent()}
            {screen === 'leaderboard' && renderLeaderboardContent()}
            {screen === 'map' && renderMapContent()}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {isMobileView ? renderMobileView() : renderDesktopView()}

      {/* Global Toast */}
      {toast && (
        <div className="animate-toast" style={{ position: 'fixed', left: '50%', bottom: '26px', transform: 'translateX(-50%)', backgroundColor: '#16130E', color: '#fff', padding: '13px 18px', borderRadius: '13px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '9px', boxShadow: '0 14px 34px -8px rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <CheckCircle size={18} weight="fill" style={{ color: '#4CC47E' }} />
          {toast}
        </div>
      )}

      {/* Badge Modal Detail Popup */}
      {selectedBadge && (
        <div 
          onClick={() => setSelectedBadge(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,19,14,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '310px', backgroundColor: '#fff', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', animation: 'cpUp .25s ease' }}
          >
            <div 
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '20px',
                backgroundColor: selectedBadge.earned ? '#EAF4EC' : '#E2E0D6',
                color: selectedBadge.earned ? '#1E8A4F' : '#7C8479',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 16px'
              }}
            >
              {(() => {
                const Icon = selectedBadge.icon;
                return <Icon size={34} weight={selectedBadge.earned ? "fill" : "regular"} />;
              })()}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1E241F', margin: '0 0 8px' }}>
              {selectedBadge.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#5B655B', lineHeight: 1.4, margin: '0 0 16px' }}>
              {selectedBadge.desc}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F6F4ED', padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700 }}>
              <span style={{ color: '#7C8479' }}>Badge Status:</span>
              <span style={{ color: selectedBadge.earned ? '#1E8A4F' : '#E8943A' }}>
                {selectedBadge.earned ? 'Earned' : 'Locked'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F6F4ED', padding: '10px 14px', borderRadius: '12px', fontSize: '12.5px', fontWeight: 700, marginTop: '8px' }}>
              <span style={{ color: '#7C8479' }}>Progress:</span>
              <span style={{ color: '#1E241F', fontFamily: "'Space Mono', monospace" }}>
                {selectedBadge.progress}
              </span>
            </div>
            <button 
              onClick={() => setSelectedBadge(null)}
              style={{ width: '100%', marginTop: '20px', backgroundColor: '#1E8A4F', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,138,79,0.3)', outline: 'none' }}
            >
              Awesome
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
