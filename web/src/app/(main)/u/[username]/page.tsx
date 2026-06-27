import { Metadata } from 'next';
import CreatorProfileView from '@/features/creator/components/creator-profile-view';

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const username = resolvedParams.username;
  try {
    const baseUrl = (process.env.INTERNAL_API_URL ? `${process.env.INTERNAL_API_URL}/api/v1` : null) || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${baseUrl}/users/profile/${username}/`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Not found');
    const profile = await res.json();
    
    return {
      title: `${profile.display_name || username} | Javahade`,
      description: profile.bio || `Lihat profil eksklusif ${profile.display_name || username} di Javahade.`,
      openGraph: {
        title: `${profile.display_name || username} | Javahade`,
        description: profile.bio || `Lihat profil eksklusif ${profile.display_name || username} di Javahade.`,
        images: profile.profile_picture_url ? [profile.profile_picture_url] : [],
      },
    };
  } catch (error) {
    return {
      title: `${username} | Javahade`,
      description: `Profil kreator ${username} di Javahade.`,
    };
  }
}

export default function CreatorProfilePage() {
  return <CreatorProfileView />;
}
