/**
 * Uygulama girişi: React 18 createRoot, yönlendirme, AuthProvider,
 * toast altyapısı. Toast satırı özelleştirilerek kapatma düğmesi
 * eklenebilir hale getirilmiştir; pdfmake yüklenmesi bu dosyada değil.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { HiX } from 'react-icons/hi'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        {/* 3s varsayılan süre; ToastBar’da ikon+mesaj+kapat; pdf ile ilgili değil */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#1e293b',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 20px -4px rgba(15, 23, 42, 0.1), 0 8px 32px -8px rgba(15, 23, 42, 0.08)',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#ffffff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
            },
          }}
        >
          {(t) => (
            <ToastBar toast={t} position={t.position || 'top-right'}>
              {({ icon, message }) => (
                <>
                  {icon}
                  {message}
                  <button
                    type="button"
                    onClick={() => toast.dismiss(t.id)}
                    className="flex-shrink-0 ml-1 -mr-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                    aria-label="Kapat"
                    title="Kapat"
                  >
                    <HiX className="w-4 h-4" strokeWidth={2} />
                  </button>
                </>
              )}
            </ToastBar>
          )}
        </Toaster>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
