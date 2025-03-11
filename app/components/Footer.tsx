'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, InstagramLogo, GithubLogo, TwitterLogo, EnvelopeSimple, Copyright } from '@phosphor-icons/react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = [
    { name: '关于', href: '/about' },
    { name: '隐私政策', href: '/privacy' },
    { name: '使用条款', href: '/terms' },
    { name: '联系我们', href: '/contact' },
  ];

  const socialLinks = [
    { 
      name: 'Instagram', 
      href: 'https://instagram.com', 
      icon: InstagramLogo,
      hoverColor: 'hover:text-pink-500'
    },
    { 
      name: 'Twitter', 
      href: 'https://twitter.com', 
      icon: TwitterLogo,
      hoverColor: 'hover:text-blue-400'
    },
    { 
      name: 'GitHub', 
      href: 'https://github.com', 
      icon: GithubLogo,
      hoverColor: 'hover:text-gray-900 dark:hover:text-white'
    },
    { 
      name: 'Email', 
      href: 'mailto:contact@example.com', 
      icon: EnvelopeSimple,
      hoverColor: 'hover:text-green-500'
    },
  ];

  return (
    <footer className="bg-white dark:bg-gray-900 mt-auto">
      {/* 主要内容区 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo 和简介 */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                影忆
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              记录光与影的诗意，捕捉生活的瞬间之美。让每一帧都成为永恒的回忆。
            </p>
          </div>

          {/* 导航链接 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              导航
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.name}>
                  <Link 
                    href={link.href}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              联系我们
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:contact@example.com"
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  contact@example.com
                </a>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  中国 · 北京
                </span>
              </li>
            </ul>
          </div>

          {/* 社交媒体 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              关注我们
            </h3>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-gray-400 ${social.hoverColor} transition-colors`}
                  title={social.name}
                >
                  <social.icon size={20} weight="regular" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 版权信息 */}
      <div className="border-t border-gray-100 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Copyright size={16} className="mr-2" />
              <span>{currentYear} 影忆。保留所有权利。</span>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                用 <Heart weight="fill" size={14} className="text-red-500 mx-1" /> 制作
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 