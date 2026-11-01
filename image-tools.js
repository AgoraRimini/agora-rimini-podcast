/* Resize uploads before transfer; originals already published remain untouched. */
window.AgoraImageTools = {
  async optimize(file, maxWidth = 1280) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw Error('Formato immagine non supportato.');
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    try {
      const scale = Math.min(1, maxWidth / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw Error('Preparazione immagine non disponibile.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.84));
      // Browsers without WebP encoding safely retain the supplied image.
      if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } finally { bitmap.close(); }
  }
};
