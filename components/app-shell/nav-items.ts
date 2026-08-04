import type { LucideIcon } from 'lucide-react';
import { PawPrint, Heart, Siren, MessageCircle, User } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: '/lost-found', label: 'Kayıp', icon: PawPrint },
  { href: '/adoptions', label: 'Sahiplen', icon: Heart },
  { href: '/emergency', label: 'Acil', icon: Siren },
  { href: '/chats', label: 'Sohbet', icon: MessageCircle },
  { href: '/profile', label: 'Profil', icon: User },
];
