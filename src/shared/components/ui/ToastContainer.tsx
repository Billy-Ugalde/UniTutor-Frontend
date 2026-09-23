import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type ToastItem } from '@/shared/store/toast.store'

const toastStyles = {
  success: {
    container: 'bg-white border-green-300 text-green-950 shadow-green-950/10',
    iconWrapper: 'bg-green-100 text-green-700',
    icon: CheckCircle2,
    title: 'text-green-900',
    message: 'text-green-700',
    close: 'text-green-500 hover:text-green-700 hover:bg-green-50',
    accent: 'bg-green-500',
  },
  error: {
    container: 'bg-white border-red-300 text-red-950 shadow-red-950/10',
    iconWrapper: 'bg-red-100 text-red-700',
    icon: XCircle,
    title: 'text-red-900',
    message: 'text-red-700',
    close: 'text-red-500 hover:text-red-700 hover:bg-red-50',
    accent: 'bg-red-500',
  },
  warning: {
    container: 'bg-white border-amber-300 text-amber-950 shadow-amber-950/10',
    iconWrapper: 'bg-amber-100 text-amber-700',
    icon: AlertTriangle,
    title: 'text-amber-900',
    message: 'text-amber-700',
    close: 'text-amber-500 hover:text-amber-700 hover:bg-amber-50',
    accent: 'bg-amber-500',
  },
  info: {
    container: 'bg-white border-blue-300 text-blue-950 shadow-blue-950/10',
    iconWrapper: 'bg-blue-100 text-blue-700',
    icon: Info,
    title: 'text-blue-900',
    message: 'text-blue-700',
    close: 'text-blue-500 hover:text-blue-700 hover:bg-blue-50',
    accent: 'bg-blue-500',
  },
}

function ToastCard({ toast }: { toast: ToastItem }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const config = toastStyles[toast.type]
  const Icon = config.icon

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300 ease-out overflow-hidden ${config.container}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${config.accent}`} />

      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.iconWrapper}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className={`text-sm font-bold ${config.title}`}>{toast.title}</h4>
        {toast.message && (
          <p className={`mt-0.5 text-xs leading-relaxed ${config.message}`}>{toast.message}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        className={`-mr-1 -mt-1 rounded-md p-1 transition-colors focus:outline-none cursor-pointer ${config.close}`}
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

