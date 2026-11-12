import markup from './inventory.html?raw';
import { inventoryPage } from '../../inventory/page';
import type { Page } from '../../site/page';

/*
 * v2's inventory: the site's (../../inventory/page.ts, its code and tabs as they are) with its markup copied here
 * (./inventory.html), so v2 can change it for its landscape window without changing the site's.
 */
export const v2InventoryPage: Page = { ...inventoryPage, markup };
