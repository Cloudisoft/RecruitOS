import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

const fieldClass =
  'w-full rounded-lg border border-[#d1d5db] bg-[#ffffff] px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 ' +
  'focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60 disabled:opacity-50'

interface FieldWrapProps {
  label?: string
  error?: string
  required?: boolean
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldWrapProps>(
  ({ label, error, required, hint, className, id, ...rest }, ref) => (
    <label className="block" htmlFor={id}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-orange-600">*</span>}
        </span>
      )}
      <input ref={ref} id={id} className={clsx(fieldClass, error && 'border-red-500/70', className)} {...rest} />
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldWrapProps>(
  ({ label, error, required, className, id, children, ...rest }, ref) => (
    <label className="block" htmlFor={id}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-orange-600">*</span>}
        </span>
      )}
      <select ref={ref} id={id} className={clsx(fieldClass, error && 'border-red-500/70', className)} {...rest}>
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldWrapProps>(
  ({ label, error, required, className, id, ...rest }, ref) => (
    <label className="block" htmlFor={id}>
      {label && (
        <span className="mb-1 block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-orange-600">*</span>}
        </span>
      )}
      <textarea ref={ref} id={id} className={clsx(fieldClass, 'min-h-[90px] resize-y', error && 'border-red-500/70', className)} {...rest} />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
)
Textarea.displayName = 'Textarea'
