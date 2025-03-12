'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, InstagramLogo, GithubLogo, TwitterLogo, EnvelopeSimple, Copyright } from '@phosphor-icons/react';
import { FOOTER_CONFIG } from '../config/footer';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  // 社交媒体图标映射
  const socialIcons = {
    'Instagram': InstagramLogo,
    'Twitter': TwitterLogo,
    'GitHub': GithubLogo,
    'Email': EnvelopeSimple,
  };

  return (
    <footer className="bg-white dark:bg-gray-900 mt-auto">
      {/* 主要内容区 */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo 和简介 */}
          <div className="space-y-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {FOOTER_CONFIG.COMPANY.NAME}
              </span>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {FOOTER_CONFIG.COMPANY.SLOGAN}
            </p>
          </div>

          {/* 导航链接 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
              导航
            </h3>
            <ul className="space-y-2">
              {FOOTER_CONFIG.NAVIGATION.map((link) => (
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
                  href={`mailto:${FOOTER_CONFIG.COMPANY.EMAIL}`}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {FOOTER_CONFIG.COMPANY.EMAIL}
                </a>
              </li>
              <li>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {FOOTER_CONFIG.COMPANY.LOCATION}
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
              {FOOTER_CONFIG.SOCIAL.map((social) => {
                const SocialIcon = socialIcons[social.name as keyof typeof socialIcons];
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-gray-400 ${social.hoverColor} transition-colors`}
                    title={social.name}
                  >
                    {SocialIcon && <SocialIcon size={20} weight="regular" />}
                  </a>
                );
              })}
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
              <span>{currentYear} {FOOTER_CONFIG.COPYRIGHT.TEXT}</span>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center">
                {FOOTER_CONFIG.COPYRIGHT.LOVE_TEXT}
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 