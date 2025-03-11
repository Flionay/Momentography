'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, InstagramLogo, GithubLogo } from '@phosphor-icons/react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="mb-4 md:mb-0">
            <Link href="/" className="text-lg font-medium tracking-tight">
              影忆
            </Link>
            <p className="text-sm text-gray-500 mt-1">
              © {currentYear} 摄影作品展示。保留所有权利。
            </p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors"
              title="Instagram"
            >
              <InstagramLogo size={22} weight="regular" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-black transition-colors"
              title="GitHub"
            >
              <GithubLogo size={22} weight="regular" />
            </a>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center">
            用
            <Heart size={14} weight="fill" className="text-red-500 mx-1" />
            制作
          </p>
        </div>
      </div>
    </footer>
  );
} 