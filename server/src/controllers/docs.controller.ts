import { Request, Response } from 'express';

// Controller to convert HTML to .docx and return as a file download.
export const convertHtmlToDocx = async (req: Request, res: Response) => {
  try {
    const html = req.body?.html || req.body?.content;
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ error: 'Missing html content in request body' });
    }

    // Use dynamic require so this code still loads even if library missing in some envs
    let docxBuffer: Buffer | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlDocx = require('html-docx-js');
      // Prefer asBuffer if available
      if (typeof htmlDocx.asBuffer === 'function') {
        docxBuffer = htmlDocx.asBuffer(html);
      } else if (typeof htmlDocx.asBlob === 'function') {
        // asBlob may return a Buffer-compatible value in Node
        const blob = htmlDocx.asBlob(html);
        if (Buffer.isBuffer(blob)) docxBuffer = blob;
        else if (blob && typeof blob.arrayBuffer === 'function') {
          // If it's a Blob-like object
          const ab = await blob.arrayBuffer();
          docxBuffer = Buffer.from(ab);
        }
      }
    } catch (e: any) {
      // conversion library not available or failed — we'll fall back below
      console.error('html-docx-js conversion failed:', e && e.message ? e.message : e);
    }

    if (docxBuffer) {
      res.setHeader('Content-Disposition', 'attachment; filename="street-cricket.docx"');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      return res.send(docxBuffer);
    }

    // Fallback: return HTML as .doc (Word can open HTML-based .doc)
    res.setHeader('Content-Disposition', 'attachment; filename="street-cricket.doc"');
    res.setHeader('Content-Type', 'application/msword');
    return res.send(html);
  } catch (err) {
    console.error('convertHtmlToDocx error:', err);
    return res.status(500).json({ error: 'Failed to convert to docx' });
  }
};
