import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'

export async function extractText(buffer: Buffer, fileName: string): Promise<string> {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return result.text
  }
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  // .doc (legacy binary) and anything else: best-effort plain decode
  return buffer.toString('utf-8')
}
