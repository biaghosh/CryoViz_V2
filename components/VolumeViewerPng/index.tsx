// components/VolumeViewerPng/index.tsx
import dynamic from 'next/dynamic';

const VolumeViewerPng = dynamic(
  () => import('./VolumeViewerPng'),   // real component
  { ssr: false }                      // <- never runs on server
);

export default VolumeViewerPng;