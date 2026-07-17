import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../constants';

/**
 * Marks a route as publicly accessible (skips JWT authentication).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
