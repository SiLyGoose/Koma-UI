import './dropdown.css';

/*
 * A dropdown in the site's style, over a <select>: the browser's own list can't be styled, and shows
 * its scrollbar. The <select> stays in the page (hidden) and keeps the value, its options and whether
 * it's disabled; this shows a button with the chosen option, and a list under it (or over it, when
 * there's more room there), a set height for the screen, that scrolls without a scrollbar showing.
 * Choosing sets the select's value and fires its `change`, so code that listens to the select works
 * as before. Hiding the select (`hidden`) hides the dropdown too. It looks like the profile menu's
 * drop-down (../account.css): the same list, items and turning arrow.
 *
 * Keyboard: Enter, Space or the arrow keys open it; the arrows (and Home, End, Page Up/Down) move;
 * Enter or Space chooses; Escape or Tab closes. Typing picks the option starting with what was typed
 * (like "12" for 12).
 */

export interface Dropdown {
  /** Shows the select as it is now (after its value or options were changed in code). */
  refresh(): void;
  /** Stops listening to the page and the select (a page going away). */
  destroy(): void;
}

let count = 0;

export function dropdown(select: HTMLSelectElement): Dropdown {
  const id = select.id || `dropdown-${++count}`;
  const wrap = document.createElement('div');
  wrap.className = 'dd';
  const button = document.createElement('button');
  button.type = 'button';
  button.id = `${id}-button`;
  button.className = `dd-button ${select.className}`;
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'dd-label';
  const arrow = document.createElement('span');
  arrow.className = 'dd-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  button.append(label, arrow);
  const list = document.createElement('ul');
  list.className = 'dd-list no-scrollbar';
  list.id = `${id}-list`;
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  list.hidden = true;
  button.setAttribute('aria-controls', list.id);

  select.classList.add('dd-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  select.after(wrap);
  wrap.append(button, list);
  // A <label for> the select now points at the button.
  for (const l of document.querySelectorAll<HTMLLabelElement>(`label[for="${select.id}"]`)) {
    l.htmlFor = button.id;
    list.setAttribute('aria-labelledby', l.id || (l.id = `${id}-label`));
  }

  /** The option the keyboard is on while the list is open. */
  let active = -1;
  const items = (): HTMLLIElement[] => [...list.children] as HTMLLIElement[];

  function refresh(): void {
    const options = [...select.options];
    if (items().length !== options.length || items().some((li, i) => li.dataset.value !== options[i]?.value)) {
      list.textContent = '';
      for (const option of options) {
        const li = document.createElement('li');
        li.className = 'dd-option';
        li.setAttribute('role', 'option');
        li.id = `${id}-option-${option.value}`;
        li.dataset.value = option.value;
        li.textContent = option.textContent;
        li.addEventListener('pointerdown', (e) => e.preventDefault()); // keep the focus on the list
        li.addEventListener('click', () => choose(option.value));
        list.append(li);
      }
    }
    for (const li of items()) {
      const chosen = li.dataset.value === select.value;
      li.classList.toggle('chosen', chosen);
      li.setAttribute('aria-selected', String(chosen));
    }
    label.textContent = select.selectedOptions[0]?.textContent ?? '';
    button.disabled = select.disabled;
    wrap.hidden = select.hidden;
    if (select.disabled) close();
  }

  function setActive(index: number): void {
    const all = items();
    if (all.length === 0) return;
    active = Math.max(0, Math.min(all.length - 1, index));
    all.forEach((li, i) => li.classList.toggle('active', i === active));
    const li = all[active] as HTMLLIElement;
    list.setAttribute('aria-activedescendant', li.id);
    li.scrollIntoView({ block: 'nearest' });
  }

  function open(): void {
    if (select.disabled || !list.hidden) return;
    list.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    // Under the button, unless it doesn't fit there and there's more room over it.
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    wrap.classList.toggle('up', below < list.offsetHeight + 12 && rect.top > below);
    setActive(Math.max(0, select.selectedIndex));
    list.focus({ preventScroll: true });
  }

  function close(focusButton = false): void {
    if (list.hidden) return;
    list.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    list.removeAttribute('aria-activedescendant');
    if (focusButton) button.focus();
  }

  function choose(value: string): void {
    const changed = select.value !== value;
    select.value = value;
    refresh();
    close(true);
    if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // Typing picks the option starting with what's been typed in the last moment.
  let typed = '';
  let typedAt = 0;
  function typeAhead(key: string): void {
    const now = performance.now();
    typed = now - typedAt < 700 ? typed + key : key;
    typedAt = now;
    const found = items().findIndex((li) => (li.textContent ?? '').toLowerCase().startsWith(typed.toLowerCase()));
    if (found >= 0) setActive(found);
  }

  button.addEventListener('click', () => (list.hidden ? open() : close()));
  button.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      open();
    }
  });
  list.addEventListener('keydown', (e) => {
    const all = items();
    const page = Math.max(1, Math.floor(list.clientHeight / ((all[0]?.offsetHeight ?? 36) || 36)) - 1);
    switch (e.key) {
      case 'ArrowDown':
        setActive(active + 1);
        break;
      case 'ArrowUp':
        setActive(active - 1);
        break;
      case 'PageDown':
        setActive(active + page);
        break;
      case 'PageUp':
        setActive(active - page);
        break;
      case 'Home':
        setActive(0);
        break;
      case 'End':
        setActive(all.length - 1);
        break;
      case 'Enter':
      case ' ': {
        const value = all[active]?.dataset.value;
        if (value !== undefined) choose(value);
        break;
      }
      case 'Escape':
        close(true);
        break;
      case 'Tab':
        close();
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) typeAhead(e.key);
        else return;
    }
    e.preventDefault();
    e.stopPropagation();
  });
  list.addEventListener('pointermove', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLLIElement>('.dd-option');
    if (li) {
      const index = items().indexOf(li);
      if (index !== active) {
        active = index;
        items().forEach((item, i) => item.classList.toggle('active', i === index));
      }
    }
  });
  const outside = (e: PointerEvent): void => {
    if (!wrap.contains(e.target as Node)) close();
  };
  document.addEventListener('pointerdown', outside);
  list.addEventListener('focusout', (e) => {
    if (!wrap.contains(e.relatedTarget as Node | null)) close();
  });

  // Options added or the select switched off or hidden in code show straight away; a value set in code needs refresh().
  const observer = new MutationObserver(refresh);
  observer.observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'selected'] });
  refresh();
  return {
    refresh,
    destroy() {
      document.removeEventListener('pointerdown', outside);
      observer.disconnect();
    },
  };
}
