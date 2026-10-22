import type { Metadata } from 'next';
import FileRepositoryManager from '@/components/FileRepositoryManager';
import '../repo.css';

export const metadata: Metadata = {
  title: 'Manage Repo | Youngkx',
  description: 'Manage files and settings for the Youngkx repository.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <FileRepositoryManager />;
}
