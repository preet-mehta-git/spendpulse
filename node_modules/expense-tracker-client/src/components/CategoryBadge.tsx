import React from 'react';
import { 
  Utensils, 
  ShoppingCart, 
  ShoppingBag, 
  Car, 
  Zap, 
  Film, 
  HeartPulse, 
  GraduationCap, 
  Landmark, 
  Gift, 
  Briefcase, 
  TrendingUp, 
  RotateCcw, 
  ArrowRightLeft, 
  Banknote, 
  HelpCircle 
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Utensils: <Utensils className="w-3.5 h-3.5" />,
  ShoppingCart: <ShoppingCart className="w-3.5 h-3.5" />,
  ShoppingBag: <ShoppingBag className="w-3.5 h-3.5" />,
  Car: <Car className="w-3.5 h-3.5" />,
  Zap: <Zap className="w-3.5 h-3.5" />,
  Film: <Film className="w-3.5 h-3.5" />,
  HeartPulse: <HeartPulse className="w-3.5 h-3.5" />,
  GraduationCap: <GraduationCap className="w-3.5 h-3.5" />,
  Landmark: <Landmark className="w-3.5 h-3.5" />,
  Gift: <Gift className="w-3.5 h-3.5" />,
  Briefcase: <Briefcase className="w-3.5 h-3.5" />,
  TrendingUp: <TrendingUp className="w-3.5 h-3.5" />,
  RotateCcw: <RotateCcw className="w-3.5 h-3.5" />,
  ArrowRightLeft: <ArrowRightLeft className="w-3.5 h-3.5" />,
  Banknote: <Banknote className="w-3.5 h-3.5" />,
  HelpCircle: <HelpCircle className="w-3.5 h-3.5" />
};

interface CategoryBadgeProps {
  name?: string;
  icon?: string;
  color?: string;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  name = 'Uncategorized',
  icon = 'HelpCircle',
  color = '#94a3b8',
  size = 'sm'
}) => {
  const iconElement = iconMap[icon] || <HelpCircle className="w-3.5 h-3.5" />;

  return (
    <span 
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{
        backgroundColor: `${color}18`,
        color: color,
        border: `1px solid ${color}35`
      }}
    >
      {iconElement}
      <span className="truncate max-w-[120px]">{name}</span>
    </span>
  );
};
