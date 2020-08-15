import { Model } from '@/store/types'
import { TeamPricingTier } from '@/utils/Enums';

export interface Team extends Model {    
  name: string,
  rmqPassword: string,
  pricingTier: TeamPricingTier
};