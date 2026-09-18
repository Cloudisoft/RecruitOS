import { useCallback, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Input'
import { EmptyState } from '../../components/ui/States'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Upload, FileText, Download, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

const categories = [
  'original_resume', 'updated_resume', 'passport', 'visa_document', 'work_authorization',
  'certification', 'degree', 'identification', 'background_check_document', 'offer_letter', 'other',
]
const MAX_SIZE = 15 * 1024 * 1024 // 15MB
const ACCEPTED = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']

export function CandidateDocuments({ candidateId }: { candidateId: string }) {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [category, setCategory] = useState('other')
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [toDelete, setToDelete] = useState<any | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: documents, isLoading } = useQuery({
    queryKey: ['candidate-documents', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_documents')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const upload = useCallback(async (file: File) => {
    if (!profile) return
    const ext = file.name.split('.').pop()
    if (!ACCEPTED.includes(`.${ext?.toLowerCase()}`)) {
      toast.error(`Unsupported file type: .${ext}`)
      return
    }
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds the 15MB limit')
      return
    }
    setUploading(true)
    try {
      const path = `${profile.org_id}/${candidateId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('candidate-documents').upload(path, file)
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from('candidate_documents').insert({
        org_id: profile.org_id,
        candidate_id: candidateId,
        file_name: file.name,
        storage_path: path,
        file_type: file.type || ext || 'unknown',
        file_size: file.size,
        category,
        uploaded_by: profile.id,
      })
      if (dbError) throw dbError

      await supabase.from('audit_logs').insert({
        org_id: profile.org_id,
        user_id: profile.id,
        action: 'upload',
        entity_type: 'candidate_documents',
        entity_id: candidateId,
        new_data: { file_name: file.name, category },
      })

      qc.invalidateQueries({ queryKey: ['candidate-documents', candidateId] })
      toast.success('Document uploaded')
    } catch (e: any) {
      toast.error(e.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [profile, candidateId, category, qc])

  async function download(doc: any) {
    const { data, error } = await supabase.storage.from('candidate-documents').createSignedUrl(doc.storage_path, 60)
    if (error || !data) {
      toast.error(error?.message ?? 'Could not generate download link')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  async function remove(doc: any) {
    const { error: storageError } = await supabase.storage.from('candidate-documents').remove([doc.storage_path])
    if (storageError) {
      toast.error(storageError.message)
      return
    }
    const { error } = await supabase.from('candidate_documents').delete().eq('id', doc.id)
    if (error) {
      toast.error(error.message)
      return
    }
    await supabase.from('audit_logs').insert({
      org_id: profile?.org_id,
      user_id: profile?.id,
      action: 'file_delete',
      entity_type: 'candidate_documents',
      entity_id: candidateId,
      old_data: { file_name: doc.file_name },
    })
    qc.invalidateQueries({ queryKey: ['candidate-documents', candidateId] })
    toast.success('Document deleted')
    setToDelete(null)
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-[220px]">
          {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </Select>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            const file = e.dataTransfer.files?.[0]
            if (file) upload(file)
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm transition-colors ${
            dragActive ? 'border-orange-500 bg-orange-500/5 text-orange-300' : 'border-[#2e2f38] text-gray-500'
          }`}
        >
          <Upload className="h-4 w-4" />
          Drag & drop a file, or
          <Button size="sm" variant="secondary" loading={uploading} onClick={() => inputRef.current?.click()}>Browse</Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPTED.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload(file)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {!isLoading && (documents ?? []).length === 0 && (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="No documents uploaded yet" description="Upload a resume, visa document, or certification." />
      )}

      <div className="space-y-2">
        {(documents ?? []).map((doc: any) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border border-[#22232b] bg-[#101116] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-200">{doc.file_name}</p>
                <p className="text-xs text-gray-500">
                  {doc.category.replace(/_/g, ' ')} · v{doc.version} · {(doc.file_size / 1024).toFixed(0)} KB ·{' '}
                  {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button size="sm" variant="ghost" onClick={() => download(doc)}><Download className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setToDelete(doc)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete document"
        message={`Delete "${toDelete?.file_name}"? This cannot be undone.`}
        danger
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={() => remove(toDelete)}
      />
    </div>
  )
}
