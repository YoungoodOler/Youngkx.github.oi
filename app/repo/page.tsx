import type { Metadata } from 'next';
import FileRepository from '@/components/FileRepository';
import './repo.css';

export const metadata: Metadata = {
  title: 'Repo | Youngkx',
  description: 'Browse and download files, notes, and resources shared by Youngkx.',
  alternates: { canonical: '/repo/' },
};

export default function Page() {
  return <FileRepository />;
}
