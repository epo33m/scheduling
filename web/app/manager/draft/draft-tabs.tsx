'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import type { WeekAlias } from '@repo/types';
import styles from './draft.module.css';

interface WeekTab {
  /** Which minggu the tab and its panel read (issue #20). */
  alias: WeekAlias;
  /** "Minggu berjalan" / "Minggu target", the label the manager sees. */
  label: string;
  /** The server-rendered draft for this minggu, shown when the tab is active. */
  panel: ReactNode;
}

/**
 * The Minggu berjalan / Minggu target switch on the draft screen (issue #20).
 * Both weeks are live at once, and the manager needs to reach whichever one the
 * staff are working through. Which panel is showing is plain local UI state:
 * it never travels in the URL, so a reload returns to `defaultAlias` (the
 * target), no matter where that tab sits in the row.
 *
 * The panels themselves are rendered on the server and passed in as children,
 * so switching tabs is instant and needs no round trip. Only the active panel
 * is mounted: the inactive one is not in the DOM at all, so each label exists
 * exactly once for screen readers and text-based test selectors alike.
 */
export function WeekTabs({
  tabs,
  defaultAlias,
}: {
  tabs: WeekTab[];
  defaultAlias: WeekAlias;
}) {
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      tabs.findIndex((tab) => tab.alias === defaultAlias),
    ),
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const idFor = (alias: WeekAlias, kind: 'tab' | 'panel') =>
    `${baseId}-${kind}-${alias}`;

  const focusTab = (index: number) => {
    const wrapped = (index + tabs.length) % tabs.length;
    setActive(wrapped);
    tabRefs.current[wrapped]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <>
      <div role="tablist" aria-label="Pilih minggu" className={styles.tabs}>
        {tabs.map((tab, index) => {
          const selected = index === active;
          return (
            <button
              key={tab.alias}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={idFor(tab.alias, 'tab')}
              aria-selected={selected}
              aria-controls={idFor(tab.alias, 'panel')}
              tabIndex={selected ? 0 : -1}
              className={styles.tab}
              data-active={selected ? '' : undefined}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab, index) =>
        // Only the active panel is mounted. Rendering both and hiding the
        // inactive one leaves a second copy of every label in the DOM, which
        // text-based selectors (and assistive tech reading the region) would
        // have to disambiguate. Mounting one keeps a single source of each
        // string, exactly as before the toggle existed.
        index === active ? (
          <div
            key={tab.alias}
            role="tabpanel"
            id={idFor(tab.alias, 'panel')}
            aria-labelledby={idFor(tab.alias, 'tab')}
            tabIndex={0}
            className={styles.tabPanel}
          >
            {tab.panel}
          </div>
        ) : null,
      )}
    </>
  );
}
