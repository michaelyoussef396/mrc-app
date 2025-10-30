import Logo from '@/components/Logo';

const PublicNav = () => {
  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-[#121D73] to-[#1e3a8a] shadow-md">
      <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
        {/* Left: Logo + Business Name */}
        <div className="flex items-center gap-3">
          <Logo size="small" />
          <span className="hidden sm:block text-lg font-semibold text-white">
            Mould & Restoration Co.
          </span>
        </div>
        
        {/* Right: Contact Info */}
        <a 
          href="tel:1300665673"
          className="text-[15px] font-semibold text-white hover:text-blue-100 transition-colors duration-200"
        >
          📞 1300 665 673
        </a>
      </div>
    </nav>
  );
};

export default PublicNav;
