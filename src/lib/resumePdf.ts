import { jsPDF } from 'jspdf'

interface ResumeContent {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  summary?: string | null
  skills?: string[]
  technical_skills?: string[]
  experience?: { employer: string; title: string; start_date?: string | null; end_date?: string | null; description?: string | null }[]
  education?: { degree: string; institution: string; field_of_study?: string | null; end_year?: number | null }[]
  certifications?: { name: string; issuer?: string | null }[]
}

/** Renders a plain, ATS-friendly single-column resume PDF from structured content. */
export function downloadResumePdf(content: ResumeContent, fileName: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  const width = doc.internal.pageSize.getWidth() - margin * 2
  let y = margin

  function ensureSpace(lines: number) {
    if (y + lines * 14 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(content.full_name || 'Candidate Resume', margin, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const contactLine = [content.email, content.phone, content.location].filter(Boolean).join('  ·  ')
  if (contactLine) {
    doc.text(contactLine, margin, y)
    y += 20
  }

  function heading(text: string) {
    ensureSpace(2)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(text.toUpperCase(), margin, y)
    y += 4
    doc.setDrawColor(200)
    doc.line(margin, y, margin + width, y)
    y += 14
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
  }

  function paragraph(text: string) {
    const lines = doc.splitTextToSize(text, width)
    ensureSpace(lines.length)
    doc.text(lines, margin, y)
    y += lines.length * 13 + 6
  }

  if (content.summary) {
    heading('Summary')
    paragraph(content.summary)
  }

  const skills = [...(content.skills ?? []), ...(content.technical_skills ?? [])]
  if (skills.length) {
    heading('Skills')
    paragraph(skills.join(', '))
  }

  if (content.experience?.length) {
    heading('Experience')
    for (const exp of content.experience) {
      ensureSpace(2)
      doc.setFont('helvetica', 'bold')
      doc.text(`${exp.title} — ${exp.employer}`, margin, y)
      doc.setFont('helvetica', 'normal')
      const dates = [exp.start_date, exp.end_date].filter(Boolean).join(' – ')
      if (dates) doc.text(dates, margin + width - doc.getTextWidth(dates), y)
      y += 14
      if (exp.description) paragraph(exp.description)
    }
  }

  if (content.education?.length) {
    heading('Education')
    for (const edu of content.education) {
      paragraph(`${edu.degree}, ${edu.institution}${edu.field_of_study ? ` — ${edu.field_of_study}` : ''}${edu.end_year ? ` (${edu.end_year})` : ''}`)
    }
  }

  if (content.certifications?.length) {
    heading('Certifications')
    for (const cert of content.certifications) {
      paragraph(`${cert.name}${cert.issuer ? ` — ${cert.issuer}` : ''}`)
    }
  }

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)
}
