'use client';
import { useEffect } from 'react';
import { initAppHeight } from '@/app/lib/appHeight';

export default function AppHeightInit() {
  useEffect(() => {
    initAppHeight();
  }, []);
  return null;
}
