import type { Chapter, Bookmark, ReadingPreferences } from '../../../types';

interface ProcessHtmlParams {
  chapter?: Chapter;
  bookmarks: Bookmark[];
  chapterIndex: number;
  searchHighlight?: { text: string; position: number } | null;
  preferences: ReadingPreferences;
}

const getContrastTextColor = (hexColor: string): string => {
  if (!hexColor || !hexColor.startsWith('#')) return '#000000';
  const r = parseInt(hexColor.substring(1, 3), 16);
  const g = parseInt(hexColor.substring(3, 5), 16);
  const b = parseInt(hexColor.substring(5, 7), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000';
  // Standard luminance threshold
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

const isDarkColor = (colorStr: string): boolean => {
  if (!colorStr) return false;
  colorStr = colorStr.trim().toLowerCase();
  if (colorStr === 'black' || colorStr === '#000' || colorStr === '#000000' || colorStr === '#1a1a1a' || colorStr === '#111' || colorStr === '#111111' || colorStr === '#222' || colorStr === '#222222') return true;
  
  // Hex colors
  const hexMatch = colorStr.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    }
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    return brightness < 85; // Under ~33% brightness is considered dark
  }
  
  // RGB / RGBA colors
  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    return brightness < 85;
  }
  
  return false;
};

const adaptColorsForThemes = (container: HTMLElement) => {
  const elements = container.querySelectorAll('*');
  elements.forEach(el => {
    const htmlEl = el as HTMLElement;
    
    // CRITICAL: Preserve bookmark highlights and search matches
    if (htmlEl.classList.contains('bookmark-highlight') || htmlEl.classList.contains('search-match')) {
      return;
    }
    
    // 1. Check legacy font color attribute
    if (htmlEl.hasAttribute('color')) {
      const colorVal = htmlEl.getAttribute('color');
      if (colorVal && isDarkColor(colorVal)) {
        htmlEl.removeAttribute('color');
      }
    }
    
    // 2. Check inline style color
    if (htmlEl.style.color) {
      const colorVal = htmlEl.style.color;
      if (isDarkColor(colorVal)) {
        htmlEl.style.color = 'currentColor';
      }
    }
  });
};

// Wraps sentences and line-sized clauses into .read-unit spans for ultra-granular reading mark tracking
export const wrapReadingUnits = (container: HTMLElement) => {
  let unitIndex = 0;
  // Select all content blocks that contain readable text
  const blocks = Array.from(container.querySelectorAll('p, li, blockquote, dd, dt, .paragraph, div, td'));
  
  for (const block of blocks) {
    const el = block as HTMLElement;
    // Skip if it contains other block containers (we only want leaf blocks)
    if (el.querySelector('p, ul, ol, table, blockquote, div, section, article')) {
      continue;
    }
    // Skip chapter titles and headings
    if (
      el.classList.contains('chapter-title-notice') ||
      el.closest('.chapter-title-notice') ||
      el.closest('h1, h2, h3, h4, h5, h6')
    ) {
      continue;
    }

    // Walk all text nodes inside this block
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let currentNode = walker.nextNode();
    while (currentNode) {
      const textNode = currentNode as Text;
      if (textNode.textContent && textNode.textContent.trim().length > 0) {
        textNodes.push(textNode);
      }
      currentNode = walker.nextNode();
    }

    for (const textNode of textNodes) {
      const parent = textNode.parentNode;
      if (!parent) continue;
      // Skip if already inside a read-unit, bookmark-highlight, or search-match
      if (parent instanceof HTMLElement && (
        parent.classList.contains('read-unit') ||
        parent.classList.contains('bookmark-highlight') ||
        parent.closest('.bookmark-highlight') ||
        parent.classList.contains('search-match') ||
        parent.closest('.search-match')
      )) {
        continue;
      }

      const text = textNode.textContent || '';
      if (!text.trim()) continue;

      // Tokenize words and whitespace to break text into line-sized units (~40-55 chars)
      const tokens = text.match(/\S+\s*/g) || [text];
      const segments: string[] = [];
      let current = '';

      for (const token of tokens) {
        // Break at natural punctuation or when approaching average reading line length (~45-55 chars)
        const isPunctuationBreak = /[.!?…;:\n\r]$/.test(current.trim()) && current.length >= 25;
        const isCommaBreak = /[,]$/.test(current.trim()) && current.length >= 35;
        const isOverLength = (current.length + token.length) > 52;

        if (current && (isOverLength || isPunctuationBreak || isCommaBreak)) {
          segments.push(current);
          current = token;
        } else {
          current += token;
        }
      }
      if (current) {
        segments.push(current);
      }

      if (segments.length === 0) continue;

      const frag = document.createDocumentFragment();
      for (const seg of segments) {
        if (!seg) continue;
        if (!seg.trim()) {
          frag.appendChild(document.createTextNode(seg));
          continue;
        }
        const span = document.createElement('span');
        span.className = 'read-unit';
        span.setAttribute('data-unit-id', `ru_${unitIndex++}`);
        span.textContent = seg;
        frag.appendChild(span);
      }

      parent.replaceChild(frag, textNode);
    }
  }
};

export const processChapterHtml = ({
  chapter,
  bookmarks,
  chapterIndex,
  searchHighlight,
  preferences,
}: ProcessHtmlParams): string => {
  if (!chapter?.content) return '';
  
  // Remove specific boilerplate text requested by user
  const content = chapter.content.replace(/If audio player doesn't work, press Stop then Play button again/gi, '');
  
  // Remove chapter title if it appears at the beginning
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;

  // Remove internal style and link tags that might interfere with reader settings
  const styles = tempDiv.querySelectorAll('style');
  styles.forEach(s => s.remove());
  const links = tempDiv.querySelectorAll('link[rel="stylesheet"]');
  links.forEach(l => l.remove());

  // Security: Sanitize dangerous tags that allow script execution (XSS)
  const dangerousTags = tempDiv.querySelectorAll('script, iframe, object, embed, applet, meta, base, form, input, noscript');
  dangerousTags.forEach(el => el.remove());

  // Security: Strip all inline event handlers (onerror, onload, onclick, etc.) and dangerous URL schemes
  const allElements = tempDiv.querySelectorAll('*');
  allElements.forEach(el => {
    const attrNames = Array.from(el.attributes).map(a => a.name);
    for (const attr of attrNames) {
      const lower = attr.toLowerCase();
      if (lower.startsWith('on')) {
        el.removeAttribute(attr);
      }
    }
    const href = el.getAttribute('href');
    if (href && /^\s*(javascript|vbscript|data:(?!image\/)):/i.test(href)) {
      el.removeAttribute('href');
    }
    const src = el.getAttribute('src');
    if (src && /^\s*(javascript|vbscript):/i.test(src)) {
      el.removeAttribute('src');
    }
  });
  
  // Remove first few headings or title paragraphs if they duplicate the chapter title
  const potentialTitles = Array.from(tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p.title, p.chapter, p[class*="title"], p[class*="chapter"]')).slice(0, 3);
  if (chapter?.title) {
    const chapterTitle = chapter.title.trim().toLowerCase();
    
    // Extract raw words of the title for fuzzy matching (e.g. matching "Capítulo 1" if title is "Capítulo 1: Introdução")
    const titleWords = chapterTitle.split(/[\s:,\-–—]+/).filter(w => w.length > 2);
    
    for (const el of potentialTitles) {
      const text = el.textContent?.trim().toLowerCase() || '';
      if (!text) continue;
      
      const isExactMatch = text === chapterTitle || text === `chapter ${chapterTitle}` || text === `capítulo ${chapterTitle}`;
      const isContained = text.includes(chapterTitle) || chapterTitle.includes(text);
      
      // Fuzzy matching: if the element text is very similar or contains most of the title's words
      let fuzzyMatch = false;
      if (titleWords.length > 0) {
        const matchingWords = titleWords.filter(word => text.includes(word));
        if (matchingWords.length >= titleWords.length * 0.7) {
          fuzzyMatch = true;
        }
      }
      
      if (isExactMatch || isContained || fuzzyMatch) {
        el.remove();
      }
    }
  }

  // Clean up EPUB navigation links (e.g. "Previous Chapter", "Next Chapter") at the bottom/top of content
  const anchors = Array.from(tempDiv.querySelectorAll('a'));
  anchors.forEach(a => {
    const text = a.textContent?.trim().toLowerCase() || '';
    const href = a.getAttribute('href') || '';
    const isNavText = text.includes('previous') || text.includes('next') || text === 'prev' || text === 'toc' || text === 'index' || text.includes('capítulo anterior') || text.includes('próximo capítulo') || text.includes('anterior') || text.includes('próximo');
    const isNavLink = href.includes('.xhtml') || href.includes('.html') || href.startsWith('#') || href === '';
    
    if (isNavText && isNavLink) {
      const parent = a.parentElement;
      if (parent) {
        const parentText = parent.textContent?.trim().toLowerCase() || '';
        const cleanParentText = parentText
          .replace(/previous/gi, '')
          .replace(/next/gi, '')
          .replace(/chapter/gi, '')
          .replace(/capítulo/gi, '')
          .replace(/anterior/gi, '')
          .replace(/próximo/gi, '')
          .replace(/index/gi, '')
          .replace(/toc/gi, '')
          .replace(/[|\s/•·-]/g, '')
          .trim();
          
        if (cleanParentText.length < 5) {
          parent.remove();
        } else {
          a.remove();
        }
      } else {
        a.remove();
      }
    }
  });

  const blocks = Array.from(tempDiv.querySelectorAll('p, span, a, nav, li'));
  blocks.forEach(block => {
    const text = block.textContent?.trim().toLowerCase() || '';
    if (!text) return;
    
    // Only remove if the element is a leaf (doesn't contain other p or div elements)
    const isLeaf = block.querySelectorAll('p, div, section, ul, ol').length === 0;
    if (!isLeaf) return;

    const navPatterns = [
      /^previous$/i, /^next$/i, /^prev$/i, /^toc$/i, /^index$/i,
      /^previous chapter$/i, /^next chapter$/i,
      /^capítulo anterior$/i, /^próximo capítulo$/i, /^proximo capitulo$/i,
      /^anterior$/i, /^próximo$/i, /^proximo$/i,
      /^table of contents$/i
    ];

    const isMatch = navPatterns.some(pattern => pattern.test(text));
    if (isMatch) {
      block.remove();
    }
  });

  // Convert double br tags into proper paragraphs to make paragraph spacing work universally
  const paragraphsWithBrs = Array.from(tempDiv.querySelectorAll('p, div, blockquote, section'));
  paragraphsWithBrs.forEach(el => {
    const htmlContent = el.innerHTML;
    // Check if it has double brs
    if (/<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/i.test(htmlContent)) {
      // Don't do this if it contains complex nested elements like other paragraphs or tables
      if (el.querySelectorAll('p, div, table, blockquote, ul, ol').length === 0) {
        const segments = htmlContent.split(/<br\s*\/?>\s*(?:&nbsp;|\s)*<br\s*\/?>/i);
        const fragment = document.createDocumentFragment();
        segments.forEach(segment => {
          if (segment.trim()) {
            const p = document.createElement('p');
            p.innerHTML = segment;
            fragment.appendChild(p);
          }
        });
        if (fragment.childNodes.length > 0) {
          el.innerHTML = '';
          el.appendChild(fragment);
        }
      }
    }
  });

  // Find all leaf divs that contain text content but no structural descendants and tag them with class "paragraph"
  const divs = Array.from(tempDiv.querySelectorAll('div'));
  divs.forEach(div => {
    if (div.querySelectorAll('div, p, section, article, table, blockquote, ul, ol').length === 0 && div.textContent?.trim()) {
      div.classList.add('paragraph');
    }
  });

  // Clean up inline styles that override margins so our paragraphSpacing preferences can work properly
  const styledElements = tempDiv.querySelectorAll('p, div, blockquote, section, [class*="para"], [class*="paragraph"], .paragraph');
  styledElements.forEach(el => {
    const element = el as HTMLElement;
    if (element.style) {
      element.style.removeProperty('margin');
      element.style.removeProperty('margin-bottom');
      element.style.removeProperty('margin-top');
      element.style.removeProperty('margin-block');
      element.style.removeProperty('margin-block-start');
      element.style.removeProperty('margin-block-end');
    }
  });

  // Apply bookmark highlights
  const textBookmarks = bookmarks.filter(b => b.type === 'text' && Number(b.chapterIndex) === Number(chapterIndex) && b.text?.trim());
  if (textBookmarks.length > 0 || searchHighlight) {
    const globalStyle = preferences.bookmarkHighlight?.style || 'highlight';
    const globalColor = preferences.bookmarkHighlight?.color || '#fef08a';
    const syncAll = preferences.syncAllBookmarks;

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const buildBookmarkRegex = (rawText: string) => {
      const clean = rawText.trim();
      if (!clean) return null;
      const words = clean.split(/\s+/).map(word => {
        let escaped = escapeRegExp(word);
        escaped = escaped
          .replace(/[''’‘`´]/g, "[''’‘`´]")
          .replace(/["“”«»„‟]/g, '["“”«»„‟]')
          .replace(/[-—–]/g, '[-—–]')
          .replace(/\.{3}|…/g, '(\\.\\.\\.|…)');
        return escaped;
      }).filter(Boolean);

      if (words.length === 0) return null;
      return new RegExp(`(${words.join('[\\s\\u00a0\\u200b\\n\\r]+')})`, 'gi');
    };

    const getBookmarkStyleAttr = (bookmark: Bookmark) => {
      const style = syncAll ? globalStyle : (bookmark.style || globalStyle);
      const color = syncAll ? globalColor : (bookmark.color || globalColor);
      if (style === 'none') return '';

      let styleAttr = '';
      if (style === 'highlight') {
        const textColor = getContrastTextColor(color);
        styleAttr = `background-color: ${color}; color: ${textColor} !important; border-radius: 4px; padding: 1px 3px; margin: 0 1px; box-decoration-break: clone; -webkit-box-decoration-break: clone; `;
      } else if (style === 'underline') {
        styleAttr = `border-bottom: 2px solid ${color}; padding-bottom: 1px; `;
      } else if (style === 'dot') {
        styleAttr = `border-bottom: 2px dotted ${color}; padding-bottom: 1px; `;
      } else if (style === 'strike') {
        styleAttr = `text-decoration: line-through; text-decoration-color: ${color}; text-decoration-thickness: 2px; `;
      }
      return styleAttr;
    };

    // 1. Recursive function to process text nodes
    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textContentStr = node.textContent || '';
        if (!textContentStr.trim()) return;

        let workingText = textContentStr;
        const replacements: { placeholderStart: string; placeholderEnd: string; htmlStart: string; htmlEnd: string }[] = [];
        let tokenIndex = 0;

        // Search highlight if present
        if (searchHighlight?.text?.trim()) {
          const escapedSearch = escapeRegExp(searchHighlight.text.trim());
          const searchRegex = new RegExp(`(${escapedSearch})`, 'gi');
          if (searchRegex.test(workingText)) {
            const startToken = `___SH_START_${tokenIndex}___`;
            const endToken = `___SH_END_${tokenIndex}___`;
            replacements.push({
              placeholderStart: startToken,
              placeholderEnd: endToken,
              htmlStart: `<span class="search-match" data-search-position="${searchHighlight.position}">`,
              htmlEnd: `</span>`
            });
            searchRegex.lastIndex = 0;
            workingText = workingText.replace(searchRegex, `${startToken}$1${endToken}`);
            tokenIndex++;
          }
        }

        // Sort bookmarks by length descending so longer phrases match first
        const sortedBookmarks = [...textBookmarks].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));

        sortedBookmarks.forEach(bookmark => {
          if (!bookmark.text?.trim()) return;

          const bookmarkRegex = buildBookmarkRegex(bookmark.text);
          if (!bookmarkRegex) return;

          bookmarkRegex.lastIndex = 0;
          if (bookmarkRegex.test(workingText)) {
            const styleAttr = getBookmarkStyleAttr(bookmark);
            if (!styleAttr && (syncAll ? globalStyle : (bookmark.style || globalStyle)) === 'none') return;

            const startToken = `___BM_START_${tokenIndex}___`;
            const endToken = `___BM_END_${tokenIndex}___`;
            replacements.push({
              placeholderStart: startToken,
              placeholderEnd: endToken,
              htmlStart: `<span class="bookmark-highlight" style="${styleAttr}" data-bookmark-id="${bookmark.id}">`,
              htmlEnd: `</span>`
            });

            bookmarkRegex.lastIndex = 0;
            workingText = workingText.replace(bookmarkRegex, `${startToken}$1${endToken}`);
            tokenIndex++;
          }
        });

        if (replacements.length > 0) {
          const tempSpan = document.createElement('span');
          let finalHtml = workingText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          replacements.forEach(rep => {
            finalHtml = finalHtml
              .split(rep.placeholderStart).join(rep.htmlStart)
              .split(rep.placeholderEnd).join(rep.htmlEnd);
          });

          tempSpan.innerHTML = finalHtml;
          node.parentNode?.replaceChild(tempSpan, node);
        }
      } else {
        const children = Array.from(node.childNodes);
        children.forEach(processNode);
      }
    };

    processNode(tempDiv);

    // 2. Secondary Pass: For any bookmarks spanning across inline elements (e.g. <em>, <b>, <span>)
    // that were not matched inside a single text node, match across block children.
    textBookmarks.forEach(bookmark => {
      if (!bookmark.text?.trim()) return;
      if (tempDiv.querySelector(`[data-bookmark-id="${bookmark.id}"]`)) {
        return; // Already highlighted in single text node pass
      }

      const bookmarkRegex = buildBookmarkRegex(bookmark.text);
      if (!bookmarkRegex) return;

      const styleAttr = getBookmarkStyleAttr(bookmark);
      if (!styleAttr && (syncAll ? globalStyle : (bookmark.style || globalStyle)) === 'none') return;

      // Find blocks containing the full text
      const blocks = Array.from(tempDiv.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6, .paragraph, td'));
      for (const block of blocks) {
        const blockText = block.textContent || '';
        bookmarkRegex.lastIndex = 0;
        const match = bookmarkRegex.exec(blockText);
        if (match && match.index !== undefined) {
          const matchStart = match.index;
          const matchEnd = matchStart + match[0].length;

          // TreeWalker to find text nodes within block and wrap the range
          const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
          let currentOffset = 0;
          let nodeToWrap: Text | null = null;
          let textNodes: { node: Text; start: number; end: number }[] = [];

          while (walker.nextNode()) {
            const textNode = walker.currentNode as Text;
            const nodeLen = textNode.textContent?.length || 0;
            const nodeStart = currentOffset;
            const nodeEnd = currentOffset + nodeLen;

            if (nodeEnd > matchStart && nodeStart < matchEnd) {
              textNodes.push({ node: textNode, start: nodeStart, end: nodeEnd });
            }
            currentOffset = nodeEnd;
          }

          if (textNodes.length === 1) {
            // Single text node within block
            const { node, start } = textNodes[0];
            const localStart = matchStart - start;
            const localEnd = matchEnd - start;
            const textVal = node.textContent || '';
            const before = textVal.substring(0, localStart);
            const matched = textVal.substring(localStart, localEnd);
            const after = textVal.substring(localEnd);

            const span = document.createElement('span');
            span.className = 'bookmark-highlight';
            span.setAttribute('style', styleAttr);
            span.setAttribute('data-bookmark-id', bookmark.id);
            span.textContent = matched;

            const frag = document.createDocumentFragment();
            if (before) frag.appendChild(document.createTextNode(before));
            frag.appendChild(span);
            if (after) frag.appendChild(document.createTextNode(after));

            node.parentNode?.replaceChild(frag, node);
            break;
          } else if (textNodes.length > 1) {
            // Across multiple text nodes
            for (let i = 0; i < textNodes.length; i++) {
              const { node, start, end } = textNodes[i];
              const localStart = Math.max(0, matchStart - start);
              const localEnd = Math.min(node.textContent?.length || 0, matchEnd - start);
              const textVal = node.textContent || '';
              const before = textVal.substring(0, localStart);
              const matched = textVal.substring(localStart, localEnd);
              const after = textVal.substring(localEnd);

              const span = document.createElement('span');
              span.className = 'bookmark-highlight';
              span.setAttribute('style', styleAttr);
              span.setAttribute('data-bookmark-id', bookmark.id);
              span.textContent = matched;

              const frag = document.createDocumentFragment();
              if (before) frag.appendChild(document.createTextNode(before));
              frag.appendChild(span);
              if (after) frag.appendChild(document.createTextNode(after));

              node.parentNode?.replaceChild(frag, node);
            }
            break;
          }
        }
      }
    });
  }

  wrapReadingUnits(tempDiv);
  adaptColorsForThemes(tempDiv);

  return tempDiv.innerHTML;
};
