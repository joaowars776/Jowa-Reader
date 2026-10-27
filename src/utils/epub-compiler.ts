import JSZip from 'jszip';
import type { Chapter } from '../types';

export async function compileTranslatedEpub(
  title: string,
  author: string,
  chapters: Chapter[]
): Promise<Blob> {
  const zip = new JSZip();
  const uuid = generateUUID();

  // 1. mimetype (MUST be uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8" ?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // 3. OEBPS/stylesheet.css
  const stylesheetCss = `body {
  font-family: "Crimson Text", "Georgia", "Times New Roman", serif;
  line-height: 1.7;
  margin: 1.5em;
  color: #111111;
  background-color: #ffffff;
}
p {
  margin-top: 0;
  margin-bottom: 1.25em;
  text-align: justify;
  text-indent: 1.5em;
}
p:first-of-type, h1 + p, h2 + p, h3 + p, h4 + p, div > p:first-child {
  text-indent: 0;
}
h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  text-align: center;
  margin-top: 1.8em;
  margin-bottom: 0.8em;
  line-height: 1.25;
}
h1 {
  font-size: 1.8em;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 0.3em;
}
blockquote {
  margin: 1.2em 2em;
  font-style: italic;
  opacity: 0.85;
}`;
  zip.file('OEBPS/stylesheet.css', stylesheetCss);

  // 4. OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.oasis-open.org/namespaces/oebps/package-2004/ns" unique-identifier="pub-id" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator opf:role="aut">${escapeXml(author)}</dc:creator>
    <dc:language>en</dc:language>
    <dc:identifier id="pub-id">urn:uuid:${uuid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="stylesheet.css" media-type="text/css"/>
    ${chapters
      .map((_, i) => `<item id="chap_${i}" href="chapter_${i}.xhtml" media-type="application/xhtml+xml"/>`)
      .join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${chapters.map((_, i) => `<itemref idref="chap_${i}"/>`).join('\n    ')}
  </spine>
</package>`;
  zip.file('OEBPS/content.opf', contentOpf);

  // 5. OEBPS/toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD NCX 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    ${chapters
      .map(
        (c, i) => `
    <navPoint id="navPoint-${i}" playOrder="${i + 1}">
      <navLabel>
        <text>${escapeXml(c.title || `Chapter ${i + 1}`)}</text>
      </navLabel>
      <content src="chapter_${i}.xhtml"/>
    </navPoint>`
      )
      .join('')}
  </navMap>
</ncx>`;
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 6. Chapter files (xhtml)
  chapters.forEach((c, i) => {
    const sanitized = sanitizeContentForXhtml(c.content);
    // Avoid prepending a title if the sanitized content already starts with a header tag (h1-h6) within its first 1000 characters
    const hasHeader = /<h[1-6]\b[^>]*>/i.test(sanitized.substring(0, 1000));
    const headerHtml = hasHeader ? '' : `<h1>${escapeXml(c.title || `Chapter ${i + 1}`)}</h1>`;

    const xhtmlContent = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${escapeXml(c.title || `Chapter ${i + 1}`)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css" />
  </head>
  <body>
    ${headerHtml}
    <div>
      ${sanitized}
    </div>
  </body>
</html>`;
    zip.file(`OEBPS/chapter_${i}.xhtml`, xhtmlContent);
  });

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
}

// Generates a random standard UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

function sanitizeContentForXhtml(content: string): string {
  if (!content) return '';
  
  let result = '';
  try {
    // Parse the HTML content into a clean DOM tree
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const body = doc.body;

    // Remove any non-XHTML compatible or safe tags
    const scripts = body.querySelectorAll('script, style, link, meta, base');
    scripts.forEach(el => el.remove());

    // Remove obsolete visual rendering containers (such as PDF page screenshot overlays) to keep EPUB lean and focused purely on translated text
    const visualArtifacts = body.querySelectorAll('.pdf-page-visual-container, [data-page-container]');
    visualArtifacts.forEach(el => el.remove());

    // Remove empty paragraphs or whitespace-only artifacts
    body.querySelectorAll('p').forEach(p => {
      if (!p.textContent?.trim() && !p.querySelector('img')) {
        p.remove();
      }
    });

    // If body contains loose text or paragraphs with multiple newlines, ensure proper <p> encapsulation
    const childElements = Array.from(body.children);
    childElements.forEach(child => {
      if (child.tagName === 'P' || child.tagName === 'DIV') {
        const text = child.innerHTML || '';
        // If the element has multiple consecutive newlines or <br><br>, split them into separate paragraphs
        if (text.includes('\n\n') || /<br\s*\/?>\s*<br\s*\/?>/i.test(text)) {
          const segments = text.split(/\n\n+|<br\s*\/?>\s*<br\s*\/?>/i);
          if (segments.length > 1) {
            const frag = doc.createDocumentFragment();
            segments.forEach(seg => {
              const trimmed = seg.trim();
              if (trimmed) {
                const p = doc.createElement('p');
                p.innerHTML = trimmed;
                frag.appendChild(p);
              }
            });
            child.replaceWith(frag);
          }
        }
      }
    });

    // Serialize the DOM tree into valid XML/XHTML
    const serializer = new XMLSerializer();
    let serialized = '';
    
    Array.from(body.childNodes).forEach(node => {
      serialized += serializer.serializeToString(node);
    });

    result = serialized.trim();
  } catch (error) {
    console.error('Error during XML serialization, falling back to regex:', error);
    
    let cleaned = content;
    
    // 1. Extract content inside <body> tags if present, to avoid nesting full HTML pages inside a <div>
    const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      cleaned = bodyMatch[1];
    } else {
      // If no body tag exists, manually strip outer html and head structures
      cleaned = cleaned.replace(/<html[^>]*>([\s\S]*?)<\/html>/gi, '$1');
      cleaned = cleaned.replace(/<head[^>]*>([\s\S]*?)<\/head>/gi, '');
    }
    
    // 2. Strip script, style, meta, link, xml declaration, base, and doctype tags
    cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    cleaned = cleaned.replace(/<link[^>]*>/gi, '');
    cleaned = cleaned.replace(/<meta[^>]*>/gi, '');
    cleaned = cleaned.replace(/<base[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    
    result = cleaned.trim();
  }

  // Common final post-processing for BOTH XMLSerializer and RegEx fallbacks
  // 1. Ensure HTML self-closing tags are XHTML compliant
  result = result
    .replace(/<br(?![^>]*\/>)([^>]*)>/gi, '<br$1 />')
    .replace(/<img(?![^>]*\/>)([^>]*)>/gi, '<img$1 />')
    .replace(/<hr(?![^>]*\/>)([^>]*)>/gi, '<hr$1 />')
    .replace(/<input(?![^>]*\/>)([^>]*)>/gi, '<input$1 />')
    .replace(/<meta(?![^>]*\/>)([^>]*)>/gi, '<meta$1 />')
    .replace(/<link(?![^>]*\/>)([^>]*)>/gi, '<link$1 />');

  // 2. Replace common named HTML entities that are unsupported in strict XML with numeric character entities
  result = result
    .replace(/&nbsp;/g, '&#160;')
    .replace(/&middot;/g, '&#183;')
    .replace(/&copy;/g, '&#169;')
    .replace(/&reg;/g, '&#174;')
    .replace(/&deg;/g, '&#176;')
    .replace(/&hellip;/g, '&#8230;')
    .replace(/&rsquo;/g, '&#8217;')
    .replace(/&lsquo;/g, '&#8216;')
    .replace(/&ldquo;/g, '&#8220;')
    .replace(/&rdquo;/g, '&#8221;')
    .replace(/&ndash;/g, '&#8211;')
    .replace(/&mdash;/g, '&#8212;')
    .replace(/&aacute;/g, '&#225;')
    .replace(/&eacute;/g, '&#233;')
    .replace(/&iacute;/g, '&#237;')
    .replace(/&oacute;/g, '&#243;')
    .replace(/&uacute;/g, '&#250;')
    .replace(/&atilde;/g, '&#227;')
    .replace(/&otilde;/g, '&#245;')
    .replace(/&ccedil;/g, '&#231;')
    .replace(/&Aacute;/g, '&#193;')
    .replace(/&Eacute;/g, '&#201;')
    .replace(/&Iacute;/g, '&#205;')
    .replace(/&Oacute;/g, '&#211;')
    .replace(/&Uacute;/g, '&#218;')
    .replace(/&Atilde;/g, '&#195;')
    .replace(/&Otilde;/g, '&#213;')
    .replace(/&Ccedil;/g, '&#199;');

  return result;
}
