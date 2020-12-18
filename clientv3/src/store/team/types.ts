import { Model } from '@/store/types'
import { TeamPricingTier } from '@/utils/Enums';

export interface Team extends Model {    
  id?: string;
  name: string;
  rmqPassword: string;
  pricingTier: TeamPricingTier;
  defaultPaymentMethodId?: string;
  billing_address1?: string;
  billing_address2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  billing_country?: string;
  billing_email?: string;
};