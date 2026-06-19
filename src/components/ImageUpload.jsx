import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function ImageUpload({ images = [], onChange }) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)

    const uploaded = []
    for (const file of files.slice(0, 5 - images.length)) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('item-images')
        .upload(path, file, { cacheControl: '3600', upsert: false })

      if (!error) {
        const { data } = supabase.storage.from('item-images').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
    }

    onChange([...images, ...uploaded])
    setUploading(false)
    inputRef.current.value = ''
  }

  async function removeImage(url) {
    // Extract path from URL
    const path = url.split('/item-images/')[1]
    if (path) await supabase.storage.from('item-images').remove([path])
    onChange(images.filter(u => u !== url))
  }

  return (
    <div>
      {/* Preview grid */}
      {images.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {images.map(url => (
            <div key={url} style={{ position: 'relative', width: 80, height: 80 }}>
              <img
                src={url}
                alt=""
                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
              />
              <button
                type="button"
                onClick={() => removeImage(url)}
                style={{
                  position: 'absolute', top: -6, right: -6,
                  background: 'var(--red)', color: 'white', border: 'none',
                  borderRadius: '50%', width: 20, height: 20, cursor: 'pointer',
                  fontSize: '0.7rem', lineHeight: 1, display: 'flex',
                  alignItems: 'center', justifyContent: 'center'
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < 5 && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFiles}
          />
          <button
            type="button"
            onClick={() => inputRef.current.click()}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', border: '2px dashed var(--border)',
              borderRadius: 10, background: 'var(--light)', cursor: 'pointer',
              fontSize: '0.85rem', color: 'var(--gray)', width: '100%',
              justifyContent: 'center', transition: 'border-color 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {uploading
              ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Загружаю...</>
              : <>📷 Добавить фото ({images.length}/5)</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
