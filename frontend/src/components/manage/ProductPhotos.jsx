import { useState } from 'react'

import Button from '../common/Button'
import ConfirmDialog from '../common/ConfirmDialog'
import { useToast } from '../../hooks/useToast'
import { portalService } from '../../services/portalService'

const MAX_PHOTOS = 8
const PHOTO_DRAG = 'application/x-jordan-photo'

function isReorderDrag(event) {
  const types = [...event.dataTransfer.types].map((type) => type.toLowerCase())
  if (types.includes(PHOTO_DRAG)) return true
  return types.includes('text/plain') && !types.includes('files')
}

function imageFiles(fileList) {
  return [...fileList].filter((file) => file.type.startsWith('image/'))
}

/**
 * Photos for one catalogue product. The first photo is the shop card.
 * Add by dropping files, and drag a photo to change its order.
 * Pass embedded when already inside the product editor modal.
 */
export default function ProductPhotos({ product, onChange, embedded = false }) {
  const { showToast } = useToast()
  const images = product.images || []
  const [captions, setCaptions] = useState({})
  const [busy, setBusy] = useState(false)
  const [removeId, setRemoveId] = useState(null)
  const [fileDrag, setFileDrag] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const run = async (action, success) => {
    setBusy(true)
    try {
      const updated = await action()
      onChange(updated)
      if (success) showToast(success, 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not update photos.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const uploadFiles = (files) => {
    if (!files.length) {
      showToast('Drop a JPEG, PNG, or WebP photo.', 'error')
      return
    }
    if (images.length + files.length > MAX_PHOTOS) {
      showToast(`A product can have at most ${MAX_PHOTOS} photos.`, 'error')
      return
    }
    run(
      () => portalService.addProductImages(product.id, files),
      files.length === 1 ? 'Photo added.' : `${files.length} photos added.`,
    )
  }

  const addPhotos = (event) => {
    const files = imageFiles(event.target.files)
    event.target.value = ''
    uploadFiles(files)
  }

  const dropFiles = (event) => {
    event.preventDefault()
    setFileDrag(false)
    const marker = event.dataTransfer.getData('text/plain')
    if (isReorderDrag(event) || marker.startsWith('photo:')) return
    if (![...event.dataTransfer.types].includes('Files')) return
    uploadFiles(imageFiles(event.dataTransfer.files))
  }

  const movePhoto = (imageId, position) => {
    if (position < 0 || position >= images.length) return
    const current = images.findIndex((image) => image.id === imageId)
    if (current < 0 || current === position) return
    run(() => portalService.updateProductImage(product.id, imageId, { position }), 'Photo moved.')
  }

  const onPhotoDrop = (event, targetId) => {
    event.preventDefault()
    event.stopPropagation()
    setDragId(null)
    setOverId(null)
    setFileDrag(false)
    const plain = event.dataTransfer.getData('text/plain')
    const sourceId = Number(event.dataTransfer.getData(PHOTO_DRAG) || (plain.startsWith('photo:') ? plain.slice(6) : ''))
    const position = images.findIndex((image) => image.id === targetId)
    if (!sourceId || position < 0) return
    movePhoto(sourceId, position)
  }

  const startReorder = (event, imageId) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(PHOTO_DRAG, String(imageId))
    event.dataTransfer.setData('text/plain', `photo:${imageId}`)
    setDragId(imageId)
  }

  const saveCaption = (image) => {
    const altText = captions[image.id] ?? image.alt_text
    run(
      () => portalService.updateProductImage(product.id, image.id, { alt_text: altText }),
      'Caption saved.',
    )
  }

  const removePhoto = async () => {
    const imageId = removeId
    setBusy(true)
    try {
      const updated = await portalService.deleteProductImage(product.id, imageId)
      onChange(updated)
      setRemoveId(null)
      showToast('Photo removed.', 'success')
    } catch (err) {
      showToast(err.response?.data?.detail || 'Could not remove photo.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      className={embedded ? '' : 'mt-6 rounded-card border border-line bg-canvas p-4'}
      aria-labelledby="product-photos-title"
    >
      {!embedded ? (
        <h2 id="product-photos-title" className="text-sm font-semibold">
          Photos
        </h2>
      ) : (
        <h2 id="product-photos-title" className="sr-only">
          Photos
        </h2>
      )}
      <p className={`${embedded ? '' : 'mt-1'} max-w-xl text-xs text-muted`}>
        Drop or choose photos. Drag to reorder — the first photo is the shop card. Saved as 1200×1200 JPEG.
      </p>

      <div
        onDragEnter={(event) => {
          event.preventDefault()
          if (isReorderDrag(event)) return
          if ([...event.dataTransfer.types].includes('Files')) setFileDrag(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (isReorderDrag(event)) {
            event.dataTransfer.dropEffect = 'none'
            return
          }
          if ([...event.dataTransfer.types].includes('Files')) setFileDrag(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFileDrag(false)
        }}
        onDrop={dropFiles}
        className={`mt-4 rounded-card border border-dashed p-4 text-center ${
          fileDrag ? 'border-accent bg-accent-soft' : 'border-line bg-subtle'
        }`}
      >
        <p className="text-sm font-medium">{fileDrag ? 'Drop to add a new photo' : 'Add photos from your computer'}</p>
        <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-control bg-ink px-4 text-sm font-semibold text-white">
          Choose photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={addPhotos}
            disabled={busy || images.length >= MAX_PHOTOS}
          />
        </label>
      </div>

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No photos yet. The shop card stays blank until you add one.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={image.id}
              onDragOver={(event) => {
                event.preventDefault()
                if (!isReorderDrag(event)) {
                  event.dataTransfer.dropEffect = 'none'
                  return
                }
                event.dataTransfer.dropEffect = 'move'
                setOverId(image.id)
              }}
              onDrop={(event) => onPhotoDrop(event, image.id)}
              className={`rounded-card border p-2.5 ${overId === image.id && dragId !== image.id ? 'border-accent' : 'border-line'}`}
            >
              <div
                draggable={!busy}
                role="button"
                tabIndex={0}
                aria-label={`Drag photo ${index + 1} to change its place. Arrow keys move it.`}
                onDragStart={(event) => startReorder(event, image.id)}
                onDragEnd={() => {
                  setDragId(null)
                  setOverId(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    movePhoto(image.id, index - 1)
                  }
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault()
                    movePhoto(image.id, index + 1)
                  }
                }}
                className={`relative mx-auto h-24 w-24 cursor-grab overflow-hidden rounded-control bg-subtle active:cursor-grabbing sm:h-28 sm:w-28 ${
                  dragId === image.id ? 'opacity-60' : ''
                }`}
              >
                <img
                  src={image.url}
                  alt={image.alt_text || product.name}
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  className="pointer-events-none h-full w-full object-cover"
                />
                {index === 0 ? (
                  <span className="absolute top-1 left-1 rounded-control bg-ink px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-wide text-white uppercase">
                    Shop
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-center text-[0.65rem] text-muted">Drag to reorder</p>
              <label className="mt-2 block text-xs">
                <span className="font-medium">Caption</span>
                <input
                  value={captions[image.id] ?? image.alt_text ?? ''}
                  onChange={(event) => setCaptions((current) => ({ ...current, [image.id]: event.target.value }))}
                  className="mt-1 min-h-9 w-full rounded-control border border-line px-2 text-sm"
                />
              </label>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                <Button type="button" size="sm" onClick={() => saveCaption(image)} disabled={busy}>
                  Save
                </Button>
                <Button type="button" size="sm" variant="danger" disabled={busy} onClick={() => setRemoveId(image.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        isOpen={removeId !== null}
        title="Remove this photo?"
        message="The shop stops showing it. You can upload it again afterwards."
        confirmLabel="Remove"
        isConfirming={busy}
        onConfirm={removePhoto}
        onCancel={() => setRemoveId(null)}
      />
    </section>
  )
}
