import markup from './shop.html?raw';
import { heroOutfitsInARow } from '../../hero-outfit-shop/page';
import { shopPage } from '../../shop/page';
import { SMALL_SCREEN } from '../landscape-css';
import type { Page } from '../../site/page';

/*
 * v2's shop: the site's (../../shop/page.ts, its code and tabs as they are) with its markup copied here (./shop.html), so
 * v2 can change it for its landscape window without changing the site's. (Its Heroes tab is to be talked over apart.)
 */
export const v2ShopPage: Page = { ...shopPage, markup };

// On a small screen its Hero Outfits tab's heroes one row, as King's Raid's shop has them (../main.ts gives its styles
// theirs there): a hero's outfits open beside it. On a bigger one, the site's desktop grid, the outfits under the hero's row.
heroOutfitsInARow(SMALL_SCREEN);
