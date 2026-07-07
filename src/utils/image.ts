/** Redimensiona una imagen a máx 1200px y la comprime a JPEG (~82%) para no llenar el almacenamiento */
export async function resizePhoto(file: File): Promise<Blob> {
  const img = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * scale)
  canvas.height = Math.round(img.height * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.82))
}
