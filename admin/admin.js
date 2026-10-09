(() => {
  'use strict';

  const NAMES_KEY = 'mbr_names';
  const FIRST_KEY = 'mbr_entry_first';
  const LAST_KEY = 'mbr_entry_last';
  const PROP_KEY = 'mbr_prop_mode';
  const names = document.querySelector('#admin_names');
  const first = document.querySelector('#admin_first_entry');
  const last = document.querySelector('#admin_last_entry');
  const propMode = document.querySelector('#admin_prop_mode');
  const status = document.querySelector('#status');

  function parseEntry(entry) {
    const match = /^\s*([^/*]+?)(?:\/(\d+))?(?:\*(\d+))?\s*$/.exec(entry);
    if (!match) return { name: entry.trim(), weight: 1 };
    return { name: match[1].trim(), weight: Number(match[2] || 1) };
  }

  function entryKey(entry) {
    const parsed = parseEntry(entry);
    return `${parsed.name}/${parsed.weight}`;
  }

  function entries() {
    return names.value.trim().split(/[,\r\n]/g).map((entry) => entry.trim()).filter(Boolean);
  }

  function refreshOptions() {
    const oldFirst = localStorage.getItem(FIRST_KEY) || '';
    const oldLast = localStorage.getItem(LAST_KEY) || '';
    const list = entries();
    first.replaceChildren(new Option('자동', ''));
    last.replaceChildren(new Option('자동', ''));
    list.forEach((entry) => {
      const parsed = parseEntry(entry);
      first.add(new Option(parsed.name, entryKey(entry)));
      last.add(new Option(parsed.name, entryKey(entry)));
    });
    first.value = list.some((entry) => entryKey(entry) === oldFirst) ? oldFirst : '';
    last.value = list.some((entry) => entryKey(entry) === oldLast) ? oldLast : '';
  }

  function show(message, error = false) {
    status.textContent = message;
    status.style.color = error ? '#f87171' : '';
  }

  function save() {
    if (first.value && first.value === last.value) {
      show('첫 번째 공과 마지막 공은 서로 다르게 선택하세요.', true);
      return;
    }
    localStorage.setItem(NAMES_KEY, names.value.trim());
    localStorage.setItem(FIRST_KEY, first.value);
    localStorage.setItem(LAST_KEY, last.value);
    localStorage.setItem(PROP_KEY, propMode.checked ? '1' : '0');
    show('설정이 저장되었습니다. 룰렛 화면에 적용됩니다.');
  }

  names.addEventListener('input', refreshOptions);
  first.addEventListener('change', () => {
    if (first.value && first.value === last.value) last.value = '';
  });
  last.addEventListener('change', () => {
    if (first.value && first.value === last.value) first.value = '';
  });
  document.querySelector('#save_settings').addEventListener('click', save);
  document.querySelector('#reset_settings').addEventListener('click', () => {
    first.value = '';
    last.value = '';
    localStorage.removeItem(FIRST_KEY);
    localStorage.removeItem(LAST_KEY);
    show('입장 순서를 자동으로 초기화했습니다.');
  });

  const storedNames = localStorage.getItem(NAMES_KEY);
  if (storedNames) names.value = storedNames;
  propMode.checked = localStorage.getItem(PROP_KEY) === '1';
  refreshOptions();
})();
