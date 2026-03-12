import {
  Building2,
  CalendarDays,
  GraduationCap,
  Image,
  Phone,
  Trophy,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';

export const SETTINGS_KEYS = {
  profile: 'page_profile',
  organization: 'page_organization',
  staff: 'page_staff',
  services: 'page_services',
  achievements: 'page_achievements',
  alumni: 'page_alumni',
  finance: 'page_finance',
  gallery: 'page_gallery',
  agenda: 'page_agenda',
  contact: 'page_contact',
};

export const SCHOOL_PAGE_TABS = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'organization', label: 'Organization', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCheck },
  { id: 'services', label: 'Services', icon: GraduationCap },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'alumni', label: 'Alumni', icon: GraduationCap },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'agenda', label: 'Agenda', icon: CalendarDays },
  { id: 'contact', label: 'Contact', icon: Phone },
];
