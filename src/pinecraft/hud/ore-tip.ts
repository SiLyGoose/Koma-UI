import { points } from '../../shared/util';
import type { PinecraftOre, WorldState } from '../protocol';
import { drawGem, ORES } from '../draw/textures';
import { ui } from '../ui';

const ORE_NAME: Record<PinecraftOre, string> = { coal: 'Coal', iron: 'Iron', gold: 'Gold', diamond: 'Diamond', emerald: 'Emerald', amethyst: 'Amethyst', ruby: 'Ruby' };

/** One row of the tooltip: the block's name and picture, and what it pays. */
function row(name: string, icon: HTMLElement, value: number): void {
  const label = document.createElement('span');
  label.className = 'pc-tip-ore';
  label.textContent = name;
  label.append(icon);
  const pays = document.createElement('span');
  pays.className = 'pc-tip-value';
  pays.textContent = `+${points(value)}`;
  ui.oreTip.append(label, pays);
}

/** What each block pays, in the tooltip over "Earned": dirt and stone (their block pictures), then the ores, cheapest first. */
export function renderOreTip(world: WorldState): void {
  ui.oreTip.textContent = '';
  for (const block of ['dirt', 'stone'] as const) {
    const icon = document.createElement('img');
    icon.className = 'pc-tip-gem pc-tip-block';
    icon.src = `${import.meta.env.BASE_URL}pinecraft/blocks/block_${block}.png`;
    icon.alt = '';
    row(block === 'dirt' ? 'Dirt' : 'Stone', icon, world.values[block] ?? 0);
  }
  // Cheapest first, by what each pays now (the values are settings, so the order can change); ties keep ORES' order.
  const byValue = [...ORES].sort((a, b) => (world.values[a] ?? 0) - (world.values[b] ?? 0));
  for (const ore of byValue) {
    // The ore's sprite (public/pinecraft/ores/ore_<ore>.png), or a gem drawn in its colour if that won't load.
    const icon = document.createElement('img');
    icon.className = 'pc-tip-gem';
    icon.src = `${import.meta.env.BASE_URL}pinecraft/ores/ore_${ore}.png`;
    icon.alt = '';
    icon.addEventListener('error', () => {
      const gem = document.createElement('canvas');
      gem.width = 40;
      gem.height = 40;
      gem.className = 'pc-tip-gem';
      drawGem(gem.getContext('2d') as CanvasRenderingContext2D, ore, 20, 20, 14);
      icon.replaceWith(gem);
    });
    row(ORE_NAME[ore], icon, world.values[ore] ?? 0);
  }
}
