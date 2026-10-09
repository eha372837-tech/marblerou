(() => {
  'use strict';

  const FIRST_KEY = 'mbr_entry_first';
  const LAST_KEY = 'mbr_entry_last';
  const firstSelect = () => document.querySelector('#in_first_entry');
  const lastSelect = () => document.querySelector('#in_last_entry');

  function parseEntry(entry) {
    const match = /^\s*([^/*]+?)(?:\/(\d+))?(?:\*(\d+))?\s*$/.exec(entry);
    if (!match) return { name: entry.trim(), weight: 1 };
    return { name: match[1].trim(), weight: Number(match[2] || 1) };
  }

  function keyFor(entry) {
    const parsed = parseEntry(entry);
    return `${parsed.name}/${parsed.weight}`;
  }

  function updateOptions(entries) {
    const first = firstSelect();
    const last = lastSelect();
    if (!first || !last) return;

    const previousFirst = localStorage.getItem(FIRST_KEY) || first.value;
    const previousLast = localStorage.getItem(LAST_KEY) || last.value;
    const options = entries.map((entry) => ({ key: keyFor(entry), label: parseEntry(entry).name }));

    for (const select of [first, last]) {
      select.replaceChildren();
      const automatic = document.createElement('option');
      automatic.value = '';
      automatic.textContent = '자동';
      select.appendChild(automatic);
      options.forEach(({ key, label }) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = label;
        select.appendChild(option);
      });
    }

    first.value = options.some((option) => option.key === previousFirst) ? previousFirst : '';
    last.value = options.some((option) => option.key === previousLast) ? previousLast : '';
    localStorage.setItem(FIRST_KEY, first.value);
    localStorage.setItem(LAST_KEY, last.value);
  }

  // getReady()에서 setMarbles() 직전에 호출됩니다.
  window.applyEntryOrder = (entries) => {
    const firstKey = firstSelect()?.value || localStorage.getItem(FIRST_KEY) || '';
    const lastKey = lastSelect()?.value || localStorage.getItem(LAST_KEY) || '';
    let ordered = entries.slice();

    if (firstKey) {
      const index = ordered.findIndex((entry) => keyFor(entry) === firstKey);
      if (index > -1) ordered.unshift(...ordered.splice(index, 1));
    }
    if (lastKey && lastKey !== firstKey) {
      const index = ordered.findIndex((entry) => keyFor(entry) === lastKey);
      if (index > -1) ordered.push(...ordered.splice(index, 1));
    }
    return ordered;
  };

  // 엔진이 갱신하는 도착 순위 배열에도 관리자 지정 순서를 반영합니다.
  window.applyAdminResultOrder = (marbles) => {
    const firstKey = localStorage.getItem(FIRST_KEY) || firstSelect()?.value || '';
    const lastKey = localStorage.getItem(LAST_KEY) || lastSelect()?.value || '';
    const ordered = marbles.slice();
    if (firstKey) {
      const index = ordered.findIndex((marble) => keyFor(marble.name) === firstKey);
      if (index > -1) ordered.unshift(...ordered.splice(index, 1));
    }
    if (lastKey && lastKey !== firstKey) {
      const index = ordered.findIndex((marble) => keyFor(marble.name) === lastKey);
      if (index > -1) ordered.push(...ordered.splice(index, 1));
    }
    return ordered;
  };

  // 설정된 경우 한 번에 한 공씩 출발시켜 실제 도착 순서를 고정합니다.
  window.getAdminLaunchOrder = (marbles) => {
    const hasCustomOrder = localStorage.getItem(FIRST_KEY) || localStorage.getItem(LAST_KEY);
    return hasCustomOrder ? window.applyAdminResultOrder(marbles) : null;
  };

  // 엔진의 초기 레인 배치에 사용할 순서를 계산합니다.
  // 중앙 레인을 첫 공, 바깥쪽 레인을 마지막 공 후보로 사용합니다.
  window.getAdminLanePlan = (groups, total, randomIds) => {
    const firstName = (localStorage.getItem(FIRST_KEY) || '').split('/')[0];
    const lastName = (localStorage.getItem(LAST_KEY) || '').split('/')[0];
    if (!firstName && !lastName) return randomIds;

    const slots = [];
    groups.forEach((group, groupIndex) => {
      for (let count = 0; count < group.count; count += 1) {
        slots.push({ groupIndex, name: group.name });
      }
    });
    const laneIds = Array.from({ length: total }, (_, index) => index);
    const firstLane = Math.floor(Math.min(total - 1, 9) / 2);
    const lastLane = Math.min(total - 1, 9);
    const used = new Set();
    const assignments = Array(slots.length);
    const takeLane = (preferred) => {
      if (!used.has(preferred)) {
        used.add(preferred);
        return preferred;
      }
      const fallback = laneIds.find((lane) => !used.has(lane));
      used.add(fallback);
      return fallback;
    };

    const firstSlot = slots.findIndex((slot) => slot.name === firstName);
    if (firstSlot > -1) assignments[firstSlot] = takeLane(firstLane);
    const lastSlot = slots.map((slot) => slot.name).lastIndexOf(lastName);
    if (lastSlot > -1 && lastSlot !== firstSlot) assignments[lastSlot] = takeLane(lastLane);
    for (let index = 0; index < assignments.length; index += 1) {
      if (assignments[index] !== undefined) continue;
      const fallback = randomIds.find((lane) => !used.has(lane));
      used.add(fallback);
      assignments[index] = fallback;
    }
    return assignments.reverse();
  };

  window.refreshEntryOrderOptions = () => updateOptions(window.getNamesForAdmin ? window.getNamesForAdmin() : []);

  document.addEventListener('DOMContentLoaded', () => {
    const first = firstSelect();
    const last = lastSelect();
    if (!first || !last) return;

    const save = () => {
      if (first.value && first.value === last.value) {
        if (document.activeElement === first) last.value = '';
        else first.value = '';
      }
      localStorage.setItem(FIRST_KEY, first.value);
      localStorage.setItem(LAST_KEY, last.value);
      // 기존 페이지의 입력 이벤트가 getReady()를 호출하므로, 선택 즉시 공 순서를 갱신합니다.
      document.querySelector('#in_names')?.dispatchEvent(new Event('input', { bubbles: true }));
    };
    first.addEventListener('change', save);
    last.addEventListener('change', save);

    // 초기화 완료 후 현재 참가자 목록으로 선택지를 채웁니다.
    const refresh = () => window.refreshEntryOrderOptions();
    document.querySelector('#in_names')?.addEventListener('input', refresh);
    document.querySelector('#in_names')?.addEventListener('blur', refresh);
    setTimeout(refresh, 300);
  });
})();
