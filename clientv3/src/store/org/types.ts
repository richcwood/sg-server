import { Model } from '@/store/types'
import { OrgPricingTier } from '@/utils/Enums';

export interface Org extends Model {    
  name: string,
  rmqPassword: string,
  pricingTier: OrgPricingTier
};