import express from 'express';
import { convertHtmlToDocx } from '../controllers/docs.controller';

const router = express.Router();

// POST /api/docs/docx - accepts { html: '<html>...</html>' } and returns a .docx/.doc file
router.post('/docx', convertHtmlToDocx);

export { router as docsRoutes };
