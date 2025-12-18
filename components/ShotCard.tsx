
import React from 'react';
import { ShotConfig, ShotPreset } from '../types';
import { SHOT_PRESETS } from '../constants';

interface ShotCardProps {
  shot: ShotConfig;
  onTypeChange: (id: number, newType: string) => void;
  onRefresh: (id: number) => void;
  onContentChange: (id: number, newContent: string) => void;
  onCopy: (content: string) => void;
}

const ShotCard: React.FC<ShotCardProps> = ({ shot, onTypeChange, onRefresh, onContentChange, onCopy }) => {
  
  const RefreshIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );

  const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5" />
    </svg>
  );

  return (
    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{shot.label}</span>
        <div className="flex gap-1">
          <button 
            onClick={() => onCopy(shot.content)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <CopyIcon />
          </button>
          <button 
            onClick={() => onRefresh(shot.id)}
            disabled={shot.isLoading}
            className={`p-1.5 rounded-full hover:bg-slate-100 text-slate-500 transition-colors ${shot.isLoading ? 'animate-spin' : ''}`}
          >
            <RefreshIcon />
          </button>
        </div>
      </div>

      <select
        value={shot.defaultType}
        onChange={(e) => onTypeChange(shot.id, e.target.value)}
        className="w-full text-sm border-slate-300 rounded-md py-1.5 px-2 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
      >
        {SHOT_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>

      <div className="flex-1 min-h-[80px] relative">
        <textarea
          value={shot.content}
          onChange={(e) => onContentChange(shot.id, e.target.value)}
          placeholder={shot.isLoading ? "正在极速构思..." : "等待生成..."}
          className={`w-full h-full text-xs text-slate-700 p-2 border border-slate-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 placeholder-slate-400 leading-relaxed transition-opacity ${shot.isLoading ? 'opacity-30' : 'opacity-100'}`}
          style={{ minHeight: '80px' }}
        />
        {shot.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShotCard;
