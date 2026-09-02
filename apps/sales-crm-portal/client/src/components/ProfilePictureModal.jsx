import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';

const PRESET_AVATARS = [
  { id: 'avatar-1', label: 'Doctor 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-2', label: 'Doctor 2', url: 'https://images.unsplash.com/photo-1594824813591-137887e4198c?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-3', label: 'Executive 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-4', label: 'Executive 2', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-5', label: 'Sales AE 1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-6', label: 'Sales AE 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-7', label: 'Admin 1', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 'avatar-8', label: 'Admin 2', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
];

export default function ProfilePictureModal({ onClose }) {
  const { currentUser, updateUserProfilePic, addToast } = useCrm();
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser?.avatar || '');
  const [customUrl, setCustomUrl] = useState('');
  const [tab, setTab] = useState('preset'); // 'preset' | 'url' | 'upload'

  const handleSelectPreset = (url) => {
    setSelectedAvatar(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('Image must be under 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedAvatar(event.target.result);
      addToast('Custom image loaded successfully', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const finalUrl = tab === 'url' && customUrl.trim() ? customUrl.trim() : selectedAvatar;
    if (!finalUrl) {
      addToast('Please select or upload a profile picture', 'error');
      return;
    }
    updateUserProfilePic(finalUrl);
    onClose();
  };

  const handleRemove = () => {
    updateUserProfilePic('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '520px',
          width: '100%',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Set Profile Picture
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '3px' }}>
              Choose an avatar preset, upload your photo, or enter an image URL.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
        </div>

        {/* Current Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '14px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#233876',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {selectedAvatar ? (
              <img src={selectedAvatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUser?.name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{currentUser?.name || 'User Profile'}</div>
            <div style={{ fontSize: '12px', color: '#233876', fontWeight: 600 }}>{currentUser?.role || 'Superadmin'}</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>Displayed in navigation, sales battlecards, and team audit records.</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
          {[
            { id: 'preset', label: 'Preset Avatars' },
            { id: 'upload', label: 'Upload File' },
            { id: 'url', label: 'Image URL' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                background: tab === t.id ? '#FFFFFF' : 'transparent',
                color: tab === t.id ? '#0F172A' : '#64748B',
                fontWeight: tab === t.id ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Presets */}
        {tab === 'preset' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {PRESET_AVATARS.map((av) => (
              <div
                key={av.id}
                onClick={() => handleSelectPreset(av.url)}
                style={{
                  cursor: 'pointer',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  width: '64px',
                  height: '64px',
                  margin: '0 auto',
                  border: selectedAvatar === av.url ? '3px solid #233876' : '2px solid #E2E8F0',
                  boxShadow: selectedAvatar === av.url ? '0 0 10px rgba(35, 56, 118, 0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <img src={av.url} alt={av.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Upload */}
        {tab === 'upload' && (
          <div style={{ marginBottom: '20px', textAlign: 'center', padding: '24px', border: '2px dashed #CBD5E1', borderRadius: '12px', background: '#F8FAFC' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📸</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>Upload Image from Computer</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>PNG, JPG, or WEBP up to 2MB</div>
            <input type="file" accept="image/*" onChange={handleFileUpload} style={{ fontSize: '12px', color: '#64748B' }} />
          </div>
        )}

        {/* Tab 3: URL */}
        {tab === 'url' && (
          <div style={{ marginBottom: '20px' }}>
            <label className="input-label">Direct Image URL</label>
            <input
              type="text"
              className="input-field"
              placeholder="https://example.com/my-photo.jpg"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setSelectedAvatar(e.target.value);
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {currentUser?.avatar && (
            <button onClick={handleRemove} className="btn btn-secondary btn-sm" style={{ color: '#DC2626' }}>
              Remove
            </button>
          )}
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary" style={{ flex: 2 }}>
            Save Profile Picture
          </button>
        </div>
      </div>
    </div>
  );
}
