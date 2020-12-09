import { Model } from '@/store/types'
import { PaymentMethodType } from '@/utils/Enums';

export interface PaymentMethod extends Model {
  id?: string;
  _teamId: string;
  name: string;
  stripePaymentMethodId: string;
  cardBrand?: string;
  last4: string;
};