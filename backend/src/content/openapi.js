export function contentOpenApi({ reference, jsonResponse, successSchema }) {
  const object = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
  const token = { type: 'string', pattern: '^[a-f0-9]{64}$' };
  const version = { type: 'integer', minimum: 1, maximum: 4294967295 };
  const ref = { revisionId: reference('DatabaseId'), version };
  const imageRef = { ...ref, expectedToken: token };
  const image = object({ id: reference('DatabaseId'), url: { type: 'string', pattern: '^/media/[a-f0-9-]{36}\\.webp$' },
    mimeType: { type: 'string', enum: ['image/webp'] }, sizeBytes: { type: 'integer', minimum: 1 },
    sortOrder: { type: 'integer', minimum: 0, maximum: 11 }, isCover: { type: 'boolean' }, caption: { type: 'string', nullable: true, maxLength: 500 } });
  const images = { type: 'array', maxItems: 12, items: image };
  const parameter = name => ({ name, in: 'path', required: true, schema: reference('DatabaseId') });
  const operation = (operationId, summary, response, parameters = [], body, publicRoute = false) => ({
    operationId, summary, tags: ['Content management'], security: publicRoute ? [] : [{ BearerAuth: [] }], parameters,
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: reference(body) } } } } : {}),
    responses: { 200: jsonResponse('Success; Cache-Control: no-store', reference(response)), default: { $ref: '#/components/responses/ApiError' } },
  });
  const paths = {};
  for (const [kind, base, idName] of [
    ['households', '/api/v1/households/me', null],
    ['rooms', '/api/v1/households/me/rooms/{roomId}', 'roomId'],
    ['services', '/api/v1/households/me/services/{serviceId}', 'serviceId'],
  ]) {
    const params = idName ? [parameter(idName)] : [];
    paths[base] = { delete: operation(`archive-${kind}`, 'Xóa mềm và lưu trữ; giữ lịch sử, ảnh và cam kết đã có', 'ContentArchiveResponse', params, 'ContentArchiveRequest') };
    paths[`${base}/restore`] = { post: operation(`restore-${kind}`, 'Khôi phục hồ sơ đã lưu trữ', 'ContentArchiveResponse', params, 'ContentArchiveRequest') };
    const upload = operation(`upload-image-${kind}`, 'Tải một ảnh JPEG/PNG/WebP (tối đa 8 MiB, 25 MP) vào bản nháp', 'ContentImagesResponse', [
      ...params, ...Object.entries(imageRef).map(([name, schema]) => ({ name, in: 'query', required: true, schema })),
    ]);
    upload.requestBody = { required: true, content: Object.fromEntries(['application/octet-stream', 'image/jpeg', 'image/png', 'image/webp']
      .map(mime => [mime, { schema: { type: 'string', format: 'binary' } }])) };
    upload.responses[201] = upload.responses[200]; delete upload.responses[200];
    paths[`${base}/images`] = {
      get: operation(`list-images-${kind}`, 'Ảnh của phiên bản hiện tại hoặc lịch sử thuộc chính hộ', 'ContentImagesResponse',
        [...params, { name: 'revisionId', in: 'query', schema: reference('DatabaseId') }]), post: upload,
    };
    paths[`${base}/images/order`] = { put: operation(`order-images-${kind}`, 'Đổi thứ tự và chọn ảnh bìa bản nháp', 'ContentImagesResponse', params, 'ContentImageOrderRequest') };
    paths[`${base}/images/{imageId}`] = { delete: operation(`remove-image-${kind}`, 'Gỡ ảnh khỏi bản nháp; giữ các phiên bản cũ', 'ContentImagesResponse', [...params, parameter('imageId')], 'ContentImageReference') };
    paths[`/api/v1/public/${kind}/{resourceId}/images`] = { get: operation(`public-images-${kind}`, 'Ảnh trong phiên bản đang công khai và đủ điều kiện', 'PublicContentImagesResponse', [parameter('resourceId')], undefined, true) };
  }
  paths['/api/v1/admin/revisions/{revisionId}/images'] = { get: operation('admin-revision-images', 'ADMIN xem ảnh phiên bản đã gửi xét duyệt', 'ContentImagesResponse', [parameter('revisionId')]) };
  paths['/api/v1/media/{key}'] = { get: {
    operationId: 'get-content-image', summary: 'Đọc ảnh công khai; bản nháp yêu cầu Bearer của chủ hộ hoặc ADMIN',
    tags: ['Content management'], security: [{}, { BearerAuth: [] }],
    parameters: [{ name: 'key', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-f0-9-]{36}\\.webp$' } }],
    responses: { 200: { description: 'WebP; private, no-store; nosniff', content: { 'image/webp': { schema: { type: 'string', format: 'binary' } } } }, default: { $ref: '#/components/responses/ApiError' } },
  } };
  return { paths, schemas: {
    ContentImage: image, ContentImageReference: object(imageRef),
    ContentImageOrderRequest: object({ ...imageRef, imageIds: { type: 'array', maxItems: 12, uniqueItems: true, items: reference('DatabaseId') }, coverImageId: { ...reference('DatabaseId'), nullable: true } }),
    ContentArchiveRequest: object({ ...ref, reason: { type: 'string', minLength: 1, maxLength: 2000 } }),
    ContentArchiveResponse: successSchema(object({ id: reference('DatabaseId'), archivedAt: { type: 'string', format: 'date-time', nullable: true }, changed: { type: 'boolean' } })),
    ContentImagesResponse: successSchema(object({ ...ref, status: { type: 'string', enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] }, images, mediaToken: token })),
    PublicContentImagesResponse: successSchema(object({ images })),
  } };
}
