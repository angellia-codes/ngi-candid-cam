import { notFound } from 'next/navigation';
import { FramePreview } from '@/components/dev/FramePreview';

export default function DevFramePage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <FramePreview />;
}
