import React from 'react';
// FIX: Import icons individually instead of using the `icons` object to resolve property not found errors.
import {
    LucideProps,
    Landmark,
    Utensils,
    Bus,
    Home,
    Ticket,
    Pizza,
    Plane,
    Heart,
    Gift,
    Book,
    Film,
    Wallet,
    TrendingUp,
    BarChart,
    Settings,
    HelpCircle,
    CircleDollarSign,
    ShoppingBag,
    Car,
    GraduationCap,
    HeartPulse,
    PawPrint,
    Receipt,
    Pencil,
    Trash2,
    Repeat,
} from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

// It's better to explicitly list icons to help with tree-shaking in production bundlers
const iconMap = {
    Landmark,
    Utensils,
    Bus,
    Home,
    Ticket,
    Pizza,
    Plane,
    Heart,
    Gift,
    Book,
    Film,
    Wallet,
    TrendingUp,
    BarChart,
    Settings,
    HelpCircle,
    CircleDollarSign,
    ShoppingBag,
    Car,
    GraduationCap,
    HeartPulse,
    PawPrint,
    Receipt,
    Pencil,
    Trash2,
    Repeat,
};

type IconName = keyof typeof iconMap;

const DynamicIcon: React.FC<DynamicIconProps> = ({ name, ...props }) => {
  const LucideIcon = iconMap[name as IconName];

  if (!LucideIcon) {
    // Return a default icon or null if the name is not in the map
    return <HelpCircle {...props} />;
  }

  return <LucideIcon {...props} />;
};

export default DynamicIcon;