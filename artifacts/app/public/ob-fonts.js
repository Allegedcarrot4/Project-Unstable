// Font obfuscation runtime — maps CJK chars back to Latin for display and clipboard
(function () {
  const OBF_KEY = "__unstable_font_obf";
  let mappings = {};
  let reverseMappings = {};
  let enabled = false;

  async function loadMappings() {
    try {
      const [m, r] = await Promise.all([
        fetch("/ob-font-mappings.json").then(r => r.json()),
        fetch("/ob-font-reverse-mappings.json").then(r => r.json()),
      ]);
      mappings = m;
      reverseMappings = r;
      enabled = true;
    } catch {}
  }

  function encodeText(text) {
    if (!enabled) return text;
    return text.split("").map(c => mappings[c] ? String.fromCodePoint(mappings[c]) : c).join("");
  }

  function decodeText(text) {
    if (!enabled) return text;
    return text.split("").map(c => reverseMappings[c.codePointAt(0)] || c).join("");
  }

  // Intercept text content setters
  const origTextContent = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
  Object.defineProperty(Node.prototype, "textContent", {
    get() { return origTextContent.get.call(this); },
    set(v) { return origTextContent.set.call(this, encodeText(String(v))); },
  });

  const origInnerText = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerText");
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    get() { return origInnerText.get.call(this); },
    set(v) { return origInnerText.set.call(this, encodeText(String(v))); },
  });

  const origInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function(pos, text) {
    return origInsertAdjacentHTML.call(this, pos, encodeText(text));
  };

  // Clipboard: decode on copy
  document.addEventListener("copy", (e) => {
    const sel = window.getSelection();
    if (sel) {
      const text = sel.toString();
      const decoded = decodeText(text);
      if (decoded !== text) {
        e.clipboardData.setData("text/plain", decoded);
        e.preventDefault();
      }
    }
  });

  // MutationObserver for dynamic content
  const observer = new MutationObserver((mutations) => {
    if (!enabled) return;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 3 && node.textContent) {
          node.textContent = encodeText(node.textContent);
        }
      }
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true, characterData: true });

  loadMappings();
})();
