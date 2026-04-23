import { common } from './common';
import { dashboard } from './dashboard';
import { lead } from './lead';
import { booking } from './booking';
import { payment } from './payment';
import { pickup } from './pickup';
import { returnMessages } from './return';
import { dispute } from './dispute';
import { settings } from './settings';
import { rbac } from './rbac';
import { clientSettings } from './client-settings';
import { rentalOrders } from './rental-orders';

export const vi = {
  ...common,
  ...dashboard,
  ...lead,
  ...booking,
  ...payment,
  ...pickup,
  ...returnMessages,
  ...dispute,
  ...settings,
  ...rbac,
  ...clientSettings,
  ...rentalOrders,
} as const;

export type ViDictionary = typeof vi;
