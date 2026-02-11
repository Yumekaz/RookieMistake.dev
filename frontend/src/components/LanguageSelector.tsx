'use client';

import { useState, useRef, useEffect } from 'react';
import type { Language } from '@/lib/api';

interface LanguageSelectorProps {
  value: Language;
  onChange: (language: Language) => void;
}

const languages: { value: Language; label: string; icon: string }[] = [
  { value: 'javascript', label: 'JavaScript', icon: '🟨' },
  { value: 'typescript', label: 'TypeScript', icon: '🔷' },
  { value: 'python', label: 'Python', icon: '🐍' },
];

// Chevron icon
const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg 
    className={`w-4 h-4 text-[#7d8590] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} 
    fill="none" 
    viewBox="0 0 24 24" 
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// Check icon
const CheckIcon = () => (
  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedLanguage = languages.find(l => l.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (language: Language) => {
    onChange(language);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef}
      className="relative"
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
          bg-[#21262d] border border-[#30363d] text-white
          hover:bg-[#30363d] hover:border-[#8b949e]
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
          transition-all duration-200 min-w-[140px]
          ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}
        `}
      >
        <span className="text-base">{selectedLanguage?.icon}</span>
        <span className="flex-1 text-left">{selectedLanguage?.label}</span>
        <ChevronDownIcon open={isOpen} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute top-full left-0 mt-2 w-full min-w-[180px]
            bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl shadow-black/50
            py-1.5 z-50 animate-fade-in
          "
        >
          {languages.map((language) => (
            <button
              key={language.value}
              onClick={() => handleSelect(language.value)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left
                hover:bg-[#2f81f7]/20 hover:text-white
                focus:outline-none focus:bg-[#2f81f7]/20
                transition-colors duration-150
                ${value === language.value ? 'text-white' : 'text-[#7d8590]'}
              `}
            >
              <span className="text-base">{language.icon}</span>
              <span className="flex-1 text-sm font-medium">{language.label}</span>
              {value === language.value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
