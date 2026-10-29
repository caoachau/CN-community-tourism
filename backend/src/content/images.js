import { createHash } from 'node:crypto';

export const MAX_IMAGES = 12;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const imageOf = row => ({
  id: String(row.id), url: `/media/${row.object_key}`, mimeType: row.mime_type,
  sizeBytes: Number(row.size_bytes), sortOrder: row.sort_order, isCover: Boolean(row.is_cover), caption: row.caption,
});
export const mediaToken = rows => createHash('sha256').update(JSON.stringify(rows.map(row =>
  [String(row.id), row.object_key, row.sort_order, Number(row.is_cover), row.caption]))).digest('hex');

// A new draft copies references; it never moves a publication's images.
export function createMediaQueries(connection) {
  const execute = (sql, values = []) => connection.execute({ sql, timeout: 10000 }, values);
  return {
    async revisionImages(revisionId) {
      return (await execute('SELECT * FROM revision_media WHERE revision_id=? ORDER BY sort_order,id', [revisionId]))[0];
    },
    async copyRevisionImages(sourceId, destinationId) {
      await execute(`INSERT INTO revision_media
        (revision_id,storage_provider,object_key,mime_type,size_bytes,uploaded_by,sort_order,is_cover,caption)
        SELECT ?,storage_provider,object_key,mime_type,size_bytes,uploaded_by,sort_order,is_cover,caption
        FROM revision_media WHERE revision_id=? ORDER BY sort_order`, [destinationId, sourceId]);
    },
    async addImage(revisionId, actorId, file, position, cover) {
      await execute(`INSERT INTO revision_media
        (revision_id,storage_provider,object_key,mime_type,size_bytes,uploaded_by,sort_order,is_cover)
        VALUES (?,?,?,'image/webp',?,?,?,?)`, [revisionId, file.provider, file.key, file.size, actorId, position, Number(cover)]);
    },
    async arrangeImages(revisionId, imageIds, coverId) {
      // Keep unique sort/cover constraints enabled while swapping positions.
      await execute('UPDATE revision_media SET sort_order=sort_order+100,is_cover=0 WHERE revision_id=?', [revisionId]);
      for (const [position, imageId] of imageIds.entries()) {
        await execute('UPDATE revision_media SET sort_order=?,is_cover=? WHERE id=? AND revision_id=?',
          [position, Number(imageId === coverId), imageId, revisionId]);
      }
    },
    async removeImage(revisionId, imageId) {
      await execute('DELETE FROM revision_media WHERE id=? AND revision_id=?', [imageId, revisionId]);
    },
  };
}
