import type { LucideIcon } from 'lucide-react';
import {
  MapPin, CircleCheckBig, Eye, Home, CircleX, MessageSquare, MessageCircle, UserPlus, Heart, Bell,
} from 'lucide-react';

export function notificationIcon(type: string): LucideIcon {
  switch (type) {
    case 'proximity_lost':
      return MapPin;
    case 'possible_match':
    case 'chip_match':
    case 'sighting_chip':
    case 'adoption_accepted':
      return CircleCheckBig;
    case 'sighting_report':
      return Eye;
    case 'adoption_application':
      return Home;
    case 'adoption_rejected':
      return CircleX;
    case 'listing_comment':
    case 'post_comment':
    case 'discussion_comment':
      return MessageSquare;
    case 'chat_message':
      return MessageCircle;
    case 'follow':
      return UserPlus;
    case 'reunion_credit':
      return Heart;
    default:
      return Bell;
  }
}
