import { el } from '../dom.js';

export function downloadText(fileName, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = el('a', { href: url, download: fileName, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// Opens the system file picker; onText gets the chosen file's contents.
export function pickTextFile(accept, onText) {
  const input = el('input', {
    type: 'file',
    accept,
    hidden: true,
    onChange: async () => {
      const file = input.files?.[0];
      input.remove();
      if (file) onText(await file.text());
    },
    onCancel: () => input.remove(),
  });
  document.body.append(input);
  input.click();
}
