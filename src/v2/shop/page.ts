import markup from './shop.html?raw';
import { heroOutfitsInARow } from '../../hero-outfit-shop/page';
import { shopPage } from '../../shop/page';
import type { Page } from '../../site/page';

/*
 * v2's shop: the site's (../../shop/page.ts, its code and tabs as they are) with its markup copied here (./shop.html), so
 * v2 can change it for its landscape window without changing the site's. (Its Heroes tab is to be talked over apart.)
 */
export const v2ShopPage: Page = { ...shopPage, markup };

// Its Hero Outfits tab's heroes one row, as King's Raid's shop has them (../main.ts gives its styles theirs): a hero's
// outfits open beside it.
heroOutfitsInARow();
