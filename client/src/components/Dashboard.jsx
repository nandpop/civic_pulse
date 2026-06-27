import React, { useState, useEffect } from 'react';
import { 
  WarningCircle, 
  ShieldCheck, 
  Timer, 
  CheckCircle, 
  TrendUp, 
  Copy, 
  ClockCountdown,
  Buildings,
  Sparkle
} from '@phosphor-icons/react';

import GoogleMapsContainer from './GoogleMapsContainer';

const C = {
  'Pothole': { c: '#C0603C', b: '#F6E7DF', i: 'ph-traffic-cone' },
  'Streetlight': { c: '#A9801C', b: '#F6EDD2', i: 'ph-lightbulb-filament' },
  'Water': { c: '#357FD6', b: '#E3EDFB', i: 'ph-drop' },
  'Waste': { c: '#1E8A4F', b: '#E3F0E6', i: 'ph-trash' },
  'Tree / Park': { c: '#5E8A2E', b: '#ECF2DD', i: 'ph-tree' },
  'Other': { c: '#7A6BC0', b: '#ECE7F7', i: 'ph-warning' }
};

const S = {
  'Reported': { fg: '#9A6516', bg: '#FAEFD8' },
  'Verified': { fg: '#176B3D', bg: '#E3F1E7' },
  'In Progress': { fg: '#2C5D9E', bg: '#E6EEFB' },
  'Resolved': { fg: '#566056', bg: '#ECEAE1' }
};

export default function Dashboard({ triggerRefresh, refreshFlag }) {
  const [issues, setIssues] = useState([]);
  const [dashFilter, setDashFilter] = useState('All');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchIssues();
  }, [refreshFlag]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/issues');
      const data = await res.json();
      setIssues(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/issues/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Status updated to ${newStatus}`);
        fetchIssues();
        if (triggerRefresh) triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics calculations
  const totalOpen = issues.filter(i => i.status !== 'Resolved').length;
  const totalResolved = issues.filter(i => i.status === 'Resolved').length;
  
  const statCards = [
    { 
      label: 'Open issues', 
      value: totalOpen, 
      sub: '+8 this week', 
      icon: <WarningCircle size={20} weight="fill" />, 
      color: '#C0603C', 
      bg: '#F6E7DF' 
    },
    { 
      label: 'Verified rate', 
      value: '89%', 
      sub: 'by community', 
      icon: <ShieldCheck size={20} weight="fill" />, 
      color: '#1E8A4F', 
      bg: '#E3F1E7' 
    },
    { 
      label: 'Avg resolution', 
      value: '3.2d', 
      sub: '-0.4d vs last mo', 
      icon: <Timer size={20} weight="fill" />, 
      color: '#357FD6', 
      bg: '#E3EDFB' 
    },
    { 
      label: 'Resolved', 
      value: totalResolved, 
      sub: '+12 vs last mo', 
      icon: <CheckCircle size={20} weight="fill" />, 
      color: '#A9801C', 
      bg: '#F6EDD2' 
    }
  ];

  // Category breakdown calculation
  const getCategoryCount = (cat) => {
    return issues.filter(i => i.cat === cat).length;
  };

  const maxCount = Math.max(...Object.keys(C).map(getCategoryCount), 1);

  // Filter issues for display in table
  const filteredIssues = issues.filter(i => dashFilter === 'All' || i.status === dashFilter);

  return (
    <div className="w-full max-w-[1180px] text-left animate-fade-up">
      
      {/* Top Title Bar */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-[18px]">
        <div>
          <div className="flex items-center gap-[9px] text-[12px] text-[#7C8479] font-bold">
            <Buildings size={16} weight="fill" className="text-[#1E8A4F]" />
            MUNICIPAL CORPORATION OF DELHI
          </div>
          <h2 className="text-[26px] font-extrabold tracking-tight text-[#1E241F] mt-[3px]">
            Issue operations dashboard
          </h2>
        </div>
        <div className="flex items-center gap-[9px] bg-gradient-to-b from-[#E9F4EC] to-[#E3F1E7] border border-[rgba(30,138,79,0.2)] px-[14px] py-[9px] rounded-[13px]">
          <Sparkle size={16} weight="fill" className="text-[#1E8A4F]" />
          <div className="text-[12.5px] font-bold text-[#176B3D]">AI updated insights · Live feed</div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-[14px] mb-[16px]">
        {statCards.map((s, idx) => (
          <div key={idx} className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[18px] p-[16px] shadow-[0_2px_10px_rgba(28,33,24,0.04)] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="text-[12px] text-[#7C8479] font-bold uppercase tracking-wider">{s.label}</div>
              <div className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center" style={{ color: s.color, backgroundColor: s.bg }}>
                {s.icon}
              </div>
            </div>
            <div className="text-[30px] font-extrabold text-[#1E241F] tracking-tight mt-[9px]">{s.value}</div>
            <div className="text-[11.5px] text-[#7C8479] font-bold mt-[2px]">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Map and Predictive Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px] mb-[16px]">
        
        {/* Live Issue Map Card */}
        <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[18px] p-[16px] shadow-[0_2px_10px_rgba(28,33,24,0.04)]">
          <div className="flex items-center justify-between mb-[13px]">
            <div className="text-[15px] font-extrabold text-[#1E241F]">Live issue map</div>
            <div className="text-[11.5px] text-[#7C8479] font-bold font-mono">{totalOpen} unresolved open</div>
          </div>
          <div className="relative rounded-[14px] overflow-hidden h-[300px] border border-[rgba(30,36,31,0.06)]">
            <GoogleMapsContainer 
              issues={issues}
              interactive={false}
              zoom={13}
            />
          </div>
        </div>

        {/* AI Insights Card */}
        <div className="bg-gradient-to-b from-[#EAF4EC] to-white border border-[rgba(30,138,79,0.18)] rounded-[18px] p-[16px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-[8px] text-[15px] font-extrabold text-[#176B3D]">
              <Sparkle size={18} weight="fill" />
              AI predictive insights
            </div>
            <div className="flex flex-col gap-[10px] mt-[13px]">
              
              <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[13px] p-[12px] flex gap-[10px] items-start">
                <div className="w-[28px] h-[28px] rounded-[8px] bg-[#F6E7DF] text-[#C0603C] flex items-center justify-center flex-shrink-0">
                  <TrendUp size={15} weight="fill" />
                </div>
                <div className="leading-snug">
                  <div className="text-[12.5px] font-bold text-[#1E241F]">Pothole reports up 32% in Lajpat Nagar</div>
                  <div className="text-[11.5px] text-[#7C8479] mt-[2px]">Recommend proactive checks on Ring Road corridor prior to next week's monsoon forecast.</div>
                </div>
              </div>

              <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[13px] p-[12px] flex gap-[10px] items-start">
                <div className="w-[28px] h-[28px] rounded-[8px] bg-[#E3EDFB] text-[#357FD6] flex items-center justify-center flex-shrink-0">
                  <Copy size={15} weight="fill" />
                </div>
                <div className="leading-snug">
                  <div className="text-[12.5px] font-bold text-[#1E241F]">Auto-Merge Opportunity Detected</div>
                  <div className="text-[11.5px] text-[#7C8479] mt-[2px]">Clustered 2 reports as duplicate of Maple St. pothole. Verify to auto-resolve copies.</div>
                </div>
              </div>

              <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[13px] p-[12px] flex gap-[10px] items-start">
                <div className="w-[28px] h-[28px] rounded-[8px] bg-[#F6EDD2] text-[#A9801C] flex items-center justify-center flex-shrink-0">
                  <ClockCountdown size={15} weight="fill" />
                </div>
                <div className="leading-snug">
                  <div className="text-[12.5px] font-bold text-[#1E241F]">SLA SLA Breach warning</div>
                  <div className="text-[11.5px] text-[#7C8479] mt-[2px]">Streetlight #1038 in progress for 5h. Expected resolution SLA limit is 12h.</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Grid of Issues List Table and Issue breakdown chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[16px]">
        
        {/* Operations Table */}
        <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[18px] p-[16px] shadow-[0_2px_10px_rgba(28,33,24,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-[13px] flex-wrap gap-[10px]">
              <div className="text-[15px] font-extrabold text-[#1E241F]">Reported issues</div>
              <div className="flex gap-[4px] bg-[#F1EFE6] p-[3px] rounded-[10px]">
                {['All', 'Reported', 'Verified', 'In Progress', 'Resolved'].map((filterVal) => (
                  <button 
                    key={filterVal}
                    onClick={() => setDashFilter(filterVal)}
                    className={`px-[12px] py-[6px] rounded-[8px] border-none text-[12px] font-bold cursor-pointer transition-all ${
                      dashFilter === filterVal 
                        ? 'bg-white text-[#1E8A4F] shadow-[0_1px_4px_rgba(28,33,24,0.1)]' 
                        : 'bg-transparent text-[#7C8479]'
                    }`}
                  >
                    {filterVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[1.7fr_0.9fr_0.7fr_0.9fr] gap-[8px] px-1 pb-[9px] text-[10.5px] font-bold text-[#A7AC9F] uppercase tracking-wider border-b border-[rgba(30,36,31,0.06)]">
              <div>Issue</div>
              <div>Location</div>
              <div>Confirms</div>
              <div>Status</div>
            </div>

            {/* Table Body */}
            <div className="flex flex-col">
              {filteredIssues.map((issue) => {
                const c = C[issue.cat] || C['Other'];
                const sc = S[issue.status] || S['Reported'];
                return (
                  <div key={issue.customId} className="grid grid-cols-[1.7fr_0.9fr_0.7fr_0.9fr] gap-[8px] items-center py-[11px] px-1 border-b border-[rgba(30,36,31,0.05)] last:border-none">
                    <div className="flex items-center gap-[9px] min-w-0">
                      <div 
                        className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                        style={{ color: c.c, backgroundColor: c.b }}
                      >
                        <i className={`ph-fill ${c.i} text-lg`}></i>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold text-[#1E241F] truncate">{issue.title}</div>
                        <div className="text-[10.5px] text-[#A7AC9F] font-mono">{issue.customId}</div>
                      </div>
                    </div>
                    <div className="text-[12px] text-[#5B655B] font-bold truncate">{issue.loc}</div>
                    <div className="text-[12.5px] font-bold text-[#41624C] font-mono">{issue.confirms}</div>
                    <div>
                      <select 
                        value={issue.status}
                        onChange={(e) => handleStatusChange(issue.customId, e.target.value)}
                        className="border-none rounded-[8px] px-2 py-[6px] text-[11.5px] font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[#1E8A4F] w-full"
                        style={{ color: sc.fg, backgroundColor: sc.bg }}
                      >
                        <option value="Reported">Reported</option>
                        <option value="Verified">Verified</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                );
              })}
              {filteredIssues.length === 0 && (
                <div className="text-center py-[40px] text-sm text-[#7C8479]">No issues match the selected filter.</div>
              )}
            </div>
          </div>
        </div>

        {/* Category breakdown bar charts */}
        <div className="bg-white border border-[rgba(30,36,31,0.07)] rounded-[18px] p-[16px] shadow-[0_2px_10px_rgba(28,33,24,0.04)] flex flex-col justify-between">
          <div>
            <div className="text-[15px] font-extrabold text-[#1E241F] mb-[14px]">Issues by category</div>
            <div className="flex flex-col gap-[13px]">
              {Object.keys(C).map((catName) => {
                const count = getCategoryCount(catName);
                const col = C[catName].c;
                const percentage = Math.round((count / maxCount) * 100);
                return (
                  <div key={catName}>
                    <div className="flex items-center justify-between text-[12px] font-bold mb-[5px]">
                      <span className="flex items-center gap-[6px] text-[#1E241F]">
                        <span style={{ color: col }}>●</span>
                        {catName}
                      </span>
                      <span className="font-mono text-[#7C8479]">{count}</span>
                    </div>
                    <div className="h-[9px] bg-[#F1EFE6] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%`, backgroundColor: col }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-[11px] mt-[18px] pt-[16px] border-t border-[rgba(30,36,31,0.06)]">
            <div className="flex-1">
              <div className="text-[24px] font-extrabold text-[#1E8A4F]">89%</div>
              <div className="text-[11px] text-[#7C8479] font-bold">Resolution rate</div>
            </div>
            <div className="flex-1">
              <div className="text-[24px] font-extrabold text-[#1E241F]">3.2d</div>
              <div className="text-[11px] text-[#7C8479] font-bold">Avg time to close</div>
            </div>
          </div>
        </div>

      </div>

      {/* Global Toast */}
      {toast && (
        <div className="fixed left-1/2 bottom-[26px] -translate-x-1/2 bg-[#16130E] text-white px-[18px] py-[13px] rounded-[13px] text-[13px] font-bold flex items-center gap-[9px] shadow-[0_14px_34px_-8px_rgba(0,0,0,0.5)] z-50 animate-toast">
          <CheckCircle size={18} weight="fill" className="text-[#4CC47E]" />
          {toast}
        </div>
      )}

    </div>
  );
}
