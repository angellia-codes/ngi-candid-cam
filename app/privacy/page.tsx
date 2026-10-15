import Link from 'next/link';
import { NOTICE_EN, NOTICE_ID } from '@/lib/copy/notice';

export const metadata = { title: "Privacy · NF'26 Candid Cam" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-prose space-y-6 px-6 py-10 leading-relaxed">
      <h1 className="font-display text-3xl text-cream">Privacy notice</h1>
      <p>{NOTICE_EN}</p>
      <p lang="id" className="text-cream/75">
        {NOTICE_ID}
      </p>

      <h2 className="font-label text-xl text-gold">What is stored</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>The framed photo you confirm</li>
        <li>When it was taken and uploaded</li>
        <li>The privacy notice version you accepted</li>
        <li>A random ID for this browser, used only to limit uploads per phone</li>
      </ul>

      <h2 className="font-label text-xl text-gold">What is not stored</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your name, employee ID or phone number</li>
        <li>Your location (photo location data is removed before upload)</li>
        <li>Anything else from your phone</li>
      </ul>

      <h2 className="font-label text-xl text-gold">Who can see the photos</h2>
      <p>Only the NGI HR team, in a private Google Drive folder. Photos are not posted publicly or shared in internal channels.</p>

      <h2 className="font-label text-xl text-gold">How long they are kept</h2>
      <p>12 months. All photos are deleted by 8 December 2027.</p>

      <h2 className="font-label text-xl text-gold">Asking for a photo to be deleted</h2>
      <p>Tell the NGI HR team which photo it is (the time it was taken helps). HR will delete it from the archive.</p>

      <Link href="/" className="inline-block font-label text-gold underline underline-offset-4">
        Back to the camera
      </Link>
    </main>
  );
}
