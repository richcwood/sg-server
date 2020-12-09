import { Model } from '@/store/types'
import { TeamPricingTier } from '@/utils/Enums';

export interface Team extends Model {    
  id?: string;
  name: string;
  rmqPassword: string;
  pricingTier: TeamPricingTier;
  defaultPaymentMethodId?: string;
};