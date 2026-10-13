import React from 'react';

export default function UserAvatar({ 
  user, 
  size = 'md', 
  className = '' 
}) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-bold',
    lg: 'w-14 h-14 text-lg font-extrabold',
    xl: 'w-20 h-20 text-2xl font-black',
    '2xl': 'w-24 h-24 text-3xl font-black'
  };

  const getInitial = () => {
    if (!user) return 'U';
    if (user.username && user.username.length > 0) {
      return user.username.charAt(0).toUpperCase();
    }
    if (user.full_name && user.full_name.length > 0) {
      return user.full_name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getBgStyle = () => {
    const char = getInitial().toUpperCase();
    const role = user?.role || 'member';
    
    if (role === 'admin') return 'bg-[#24483B] text-[#B8C8AD] border-[#24483B]/20';
    if (role === 'trainer') return 'bg-[#6F8761] text-[#FAF8F3] border-[#6F8761]/20';
    
    // Member palette variations based on first letter
    const palettes = [
      'bg-[#24483B] text-[#FAF8F3] border-[#24483B]/20',
      'bg-[#EBC9B8] text-[#24483B] border-[#EBC9B8]/40',
      'bg-[#E6E0F1] text-[#24483B] border-[#E6E0F1]/40',
      'bg-[#B8C8AD] text-[#24483B] border-[#B8C8AD]/40',
      'bg-[#F2EEE5] text-[#24483B] border-[#24483B]/10',
    ];
    const index = char.charCodeAt(0) % palettes.length;
    return palettes[index];
  };

  const avatarUrl = user?.avatar_url;
  const initial = getInitial();
  const dimensionClass = sizeClasses[size] || sizeClasses.md;

  if (avatarUrl && avatarUrl.startsWith('http')) {
    return (
      <img
        src={avatarUrl}
        alt={user?.full_name || user?.username || 'User Avatar'}
        className={`${dimensionClass} rounded-2xl object-cover border border-[#24483B]/10 shadow-2xs ${className}`}
        onError={(e) => {
          // If image fails to load, fallback to initial
          e.target.style.display = 'none';
        }}
      />
    );
  }

  return (
    <div 
      className={`${dimensionClass} rounded-2xl flex items-center justify-center font-extrabold shadow-2xs border select-none transition-transform ${getBgStyle()} ${className}`}
      title={user?.full_name ? `${user.full_name} (@${user.username})` : 'User Profile'}
    >
      <span>{initial}</span>
    </div>
  );
}
