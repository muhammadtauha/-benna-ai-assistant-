'use client'

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import React from 'react'

interface BennaLoaderProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  variant?: "inline" | "overlay" | "minimal";
  className?: string;
}

export default function BennaLoader({
  size = "md",
  label,
  variant = "inline",
  className = "",
}: BennaLoaderProps) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  const containerClasses = {
    inline: "flex flex-col items-center justify-center gap-8 p-8",
    overlay: "fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-12 p-12 bg-background/95 backdrop-blur-sm",
    minimal: "inline-flex items-center justify-center",
  }

  const cube = (
    <div className={cn(`relative ${sizeClasses[size]} flex items-center justify-center preserve-3d`, className)}>
      {/* THE SPINNING CUBE CONTAINER */}
      <div className='relative w-full h-full preserve-3d animate-cube-spin'>
        
        {/* Internal Core (The energy source) */}
        <div className='absolute inset-0 m-auto w-1/3 h-1/3 bg-white rounded-full blur-md shadow-[0_0_40px_rgba(255,255,255,0.8)] animate-pulse-fast' />

        {/* CUBE FACES */}
        {/* Front */}
        <div className='side-wrapper front'>
          <div className='face bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' />
        </div>
        
        {/* Back */}
        <div className='side-wrapper back'>
          <div className='face bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' />
        </div>

        {/* Right */}
        <div className='side-wrapper right'>
          <div className='face bg-purple-500/10 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' />
        </div>

        {/* Left */}
        <div className='side-wrapper left'>
          <div className='face bg-purple-500/10 border-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)]' />
        </div>

        {/* Top */}
        <div className='side-wrapper top'>
          <div className='face bg-indigo-500/10 border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' />
        </div>

        {/* Bottom */}
        <div className='side-wrapper bottom'>
          <div className='face bg-indigo-500/10 border-2 border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.4)]' />
        </div>
      </div>

      {/* Floor Shadow */}
      <div className='absolute -bottom-20 w-full h-8 bg-black/40 blur-xl rounded-[100%] animate-shadow-breathe' />
    </div>
  )

  if (variant === "overlay") {
    return (
      <div className="perspective-container">
        {cube}
        {label && (
          <p className="mt-8 text-sm font-medium text-muted-foreground animate-pulse">
            {label}
          </p>
        )}
        <style>{`
          @keyframes cubeSpin {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
          }

          @keyframes breathe {
            0%, 100% { transform: translateZ(48px); opacity: 0.8; }
            50% { transform: translateZ(80px); opacity: 0.4; border-color: rgba(255,255,255,0.8); }
          }

          @keyframes pulse-fast {
              0%, 100% { transform: scale(0.8); opacity: 0.5; }
              50% { transform: scale(1.2); opacity: 1; }
          }

          @keyframes shadow-breathe {
              0%, 100% { transform: scale(1); opacity: 0.4; }
              50% { transform: scale(1.5); opacity: 0.2; }
          }

          .animate-cube-spin {
            animation: cubeSpin 8s linear infinite;
          }

          .animate-pulse-fast {
              animation: pulse-fast 2s ease-in-out infinite;
          }

          .animate-shadow-breathe {
              animation: shadow-breathe 3s ease-in-out infinite;
          }

          .preserve-3d {
            transform-style: preserve-3d;
          }

          .side-wrapper {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-style: preserve-3d;
          }

          .face {
            width: 100%;
            height: 100%;
            position: absolute;
            animation: breathe 3s ease-in-out infinite;
            backdrop-filter: blur(2px);
          }

          .front  { transform: rotateY(0deg); }
          .back   { transform: rotateY(180deg); }
          .right  { transform: rotateY(90deg); }
          .left   { transform: rotateY(-90deg); }
          .top    { transform: rotateX(90deg); }
          .bottom { transform: rotateX(-90deg); }
        `}</style>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="perspective-container inline-block">
        {cube}
        <style>{`
          @keyframes cubeSpin {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
          }

          @keyframes breathe {
            0%, 100% { transform: translateZ(32px); opacity: 0.8; }
            50% { transform: translateZ(60px); opacity: 0.4; border-color: rgba(255,255,255,0.8); }
          }

          @keyframes pulse-fast {
              0%, 100% { transform: scale(0.8); opacity: 0.5; }
              50% { transform: scale(1.2); opacity: 1; }
          }

          @keyframes shadow-breathe {
              0%, 100% { transform: scale(1); opacity: 0.4; }
              50% { transform: scale(1.5); opacity: 0.2; }
          }

          .animate-cube-spin {
            animation: cubeSpin 8s linear infinite;
          }

          .animate-pulse-fast {
              animation: pulse-fast 2s ease-in-out infinite;
          }

          .animate-shadow-breathe {
              animation: shadow-breathe 3s ease-in-out infinite;
          }

          .preserve-3d {
            transform-style: preserve-3d;
          }

          .side-wrapper {
            position: absolute;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-style: preserve-3d;
          }

          .face {
            width: 100%;
            height: 100%;
            position: absolute;
            animation: breathe 3s ease-in-out infinite;
            backdrop-filter: blur(2px);
          }

          .front  { transform: rotateY(0deg); }
          .back   { transform: rotateY(180deg); }
          .right  { transform: rotateY(90deg); }
          .left   { transform: rotateY(-90deg); }
          .top    { transform: rotateX(90deg); }
          .bottom { transform: rotateX(-90deg); }
        `}</style>
      </div>
    );
  }

  return (
    <div className={cn("perspective-container flex flex-col items-center justify-center gap-8", containerClasses[variant])}>
      {cube}
      {label && (
        <div className='flex flex-col items-center gap-1'>
          <h3 className='text-sm font-semibold tracking-[0.3em] text-cyan-300 uppercase'>
            {t("Loading", "جاري التحميل")}
          </h3>
          <p className='text-xs text-slate-400'>
            {label}
          </p>
        </div>
      )}
      <style>{`
        @keyframes cubeSpin {
          0% { transform: rotateX(0deg) rotateY(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg); }
        }

        @keyframes breathe {
          0%, 100% { transform: translateZ(32px); opacity: 0.8; }
          50% { transform: translateZ(60px); opacity: 0.4; border-color: rgba(255,255,255,0.8); }
        }

        @keyframes pulse-fast {
            0%, 100% { transform: scale(0.8); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 1; }
        }

        @keyframes shadow-breathe {
            0%, 100% { transform: scale(1); opacity: 0.4; }
            50% { transform: scale(1.5); opacity: 0.2; }
        }

        .animate-cube-spin {
          animation: cubeSpin 8s linear infinite;
        }

        .animate-pulse-fast {
            animation: pulse-fast 2s ease-in-out infinite;
        }

        .animate-shadow-breathe {
            animation: shadow-breathe 3s ease-in-out infinite;
        }

        .preserve-3d {
          transform-style: preserve-3d;
        }

        .side-wrapper {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-style: preserve-3d;
        }

        .face {
          width: 100%;
          height: 100%;
          position: absolute;
          animation: breathe 3s ease-in-out infinite;
          backdrop-filter: blur(2px);
        }

        .front  { transform: rotateY(0deg); }
        .back   { transform: rotateY(180deg); }
        .right  { transform: rotateY(90deg); }
        .left   { transform: rotateY(-90deg); }
        .top    { transform: rotateX(90deg); }
        .bottom { transform: rotateX(-90deg); }
      `}</style>
    </div>
  );
}
