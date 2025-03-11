'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { House, Image, FolderOpen, MapPin, List } from '@phosphor-icons/react';

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: '首页', href: '/', icon: House },
    { name: '浏览', href: '/browse', icon: Image },
    { name: '相册', href: '/albums', icon: FolderOpen },
    { name: '地图', href: '/map', icon: MapPin },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link 
              href="/" 
              className="text-xl font-bold tracking-tighter"
            >
              影忆
            </Link>
          </div>
          
          {/* 桌面导航 */}
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                const Icon = link.icon;
                
                return (
                  <li key={link.href}>
                    <Link 
                      href={link.href}
                      className={`flex items-center space-x-1 py-2 transition-colors relative ${
                        isActive 
                          ? 'text-black font-medium' 
                          : 'text-gray-600 hover:text-black'
                      }`}
                    >
                      <Icon size={18} weight={isActive ? "fill" : "regular"} />
                      <span>{link.name}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="navbar-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* 移动菜单按钮 */}
          <button 
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-black hover:bg-gray-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <List size={24} />
          </button>
        </div>
      </div>
      
      {/* 移动导航菜单 */}
      {isMobileMenuOpen && (
        <motion.div 
          className="md:hidden bg-white shadow-lg"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <ul className="px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              
              return (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className={`flex items-center space-x-3 p-3 rounded-md ${
                      isActive 
                        ? 'bg-gray-100 text-black font-medium' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon size={20} weight={isActive ? "fill" : "regular"} />
                    <span>{link.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </header>
  );
} 