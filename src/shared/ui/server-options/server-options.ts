/** Fills a server picker with `servers`, `current` selected (hidden with only one to pick). */
export function fillServers(select: HTMLSelectElement, servers: readonly { id: string; name: string }[], current: string | null): void {
  select.textContent = '';
  select.hidden = servers.length < 2;
  for (const s of servers) {
    const option = document.createElement('option');
    option.textContent = s.name;
    option.value = s.id;
    option.selected = s.id === current;
    select.append(option);
  }
}
