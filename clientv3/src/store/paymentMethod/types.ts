import { Model, LinkedModel } from '@/store/types'
import { PaymentMethodType } from '@/utils/Enums';

export interface PaymentMethod extends Model {
  _teamId: string;
  name: string;
  stripePaymentMethodId: string;
  cardBrand?: string;
  last4: string;
  default: boolean;
};