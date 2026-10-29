import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'api.dart';
import 'common.dart';

class ApiPhoto extends StatefulWidget {
  const ApiPhoto({
    super.key,
    required this.api,
    required this.url,
    this.authenticated = true,
    this.height = 150,
    this.width,
    this.label = 'Ảnh giới thiệu',
  });
  final TourismApi api;
  final String url, label;
  final bool authenticated;
  final double height;
  final double? width;
  @override
  State<ApiPhoto> createState() => _ApiPhotoState();
}

class _ApiPhotoState extends State<ApiPhoto> {
  late Future<Uint8List> future;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(ApiPhoto old) {
    super.didUpdateWidget(old);
    if (old.url != widget.url ||
        old.api != widget.api ||
        old.authenticated != widget.authenticated) {
      load();
    }
  }

  void load() {
    future = widget.api.imageBytes(
      widget.url,
      authenticated: widget.authenticated,
    );
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: widget.height,
    width: widget.width,
    child: FutureBuilder<Uint8List>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          return Image.memory(
            snapshot.data!,
            fit: BoxFit.cover,
            width: widget.width,
            height: widget.height,
            semanticLabel: widget.label,
            errorBuilder: (_, _, _) =>
                const Center(child: Icon(Icons.broken_image_outlined)),
          );
        }
        if (snapshot.hasError) {
          return Center(
            child: IconButton(
              tooltip: 'Tải lại ảnh',
              onPressed: () => setState(load),
              icon: const Icon(Icons.refresh),
            ),
          );
        }
        return const Center(child: CircularProgressIndicator(strokeWidth: 2));
      },
    ),
  );
}

class PublicCover extends StatefulWidget {
  const PublicCover({
    super.key,
    required this.api,
    required this.endpoint,
    required this.fallback,
    required this.height,
  });
  final TourismApi api;
  final String endpoint;
  final Widget fallback;
  final double height;
  @override
  State<PublicCover> createState() => _PublicCoverState();
}

class _PublicCoverState extends State<PublicCover> {
  late Future<Json> future;
  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void didUpdateWidget(PublicCover old) {
    super.didUpdateWidget(old);
    if (old.endpoint != widget.endpoint || old.api != widget.api) load();
  }

  void load() {
    future = widget.api.request('GET', widget.endpoint, authenticated: false);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
    future: future,
    builder: (context, snapshot) {
      final images = records(snapshot.data?['images']);
      if (images.isEmpty) return widget.fallback;
      final cover = images.firstWhere(
        (image) => image['isCover'] == true,
        orElse: () => images.first,
      );
      return ApiPhoto(
        api: widget.api,
        url: cover['url'] as String,
        authenticated: false,
        height: widget.height,
        width: double.infinity,
        label: 'Ảnh do hộ dân cung cấp',
      );
    },
  );
}

class PublicGallery extends StatefulWidget {
  const PublicGallery({super.key, required this.api, required this.endpoint});
  final TourismApi api;
  final String endpoint;
  @override
  State<PublicGallery> createState() => _PublicGalleryState();
}

class _PublicGalleryState extends State<PublicGallery> {
  late final Future<Json> future = widget.api.request(
    'GET',
    widget.endpoint,
    authenticated: false,
  );
  @override
  Widget build(BuildContext context) => FutureBuilder<Json>(
    future: future,
    builder: (context, snapshot) {
      final images = records(snapshot.data?['images']);
      if (images.isEmpty) return const SizedBox.shrink();
      return SizedBox(
        height: 150,
        child: ListView.separated(
          padding: const EdgeInsets.all(12),
          scrollDirection: Axis.horizontal,
          itemCount: images.length,
          separatorBuilder: (_, _) => const SizedBox(width: 10),
          itemBuilder: (context, index) => InkWell(
            onTap: () => showDialog<void>(
              context: context,
              builder: (context) => Dialog(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Align(
                      alignment: Alignment.centerRight,
                      child: IconButton(
                        tooltip: 'Đóng ảnh',
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close),
                      ),
                    ),
                    ApiPhoto(
                      api: widget.api,
                      url: images[index]['url'] as String,
                      authenticated: false,
                      height: 340,
                      width: double.infinity,
                    ),
                  ],
                ),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: ApiPhoto(
                api: widget.api,
                url: images[index]['url'] as String,
                authenticated: false,
                height: 126,
                width: 170,
              ),
            ),
          ),
        ),
      );
    },
  );
}

class MediaManager extends StatefulWidget {
  const MediaManager({
    super.key,
    required this.api,
    required this.path,
    required this.profile,
    required this.editable,
  });
  final TourismApi api;
  final String path;
  final Json profile;
  final bool editable;
  @override
  State<MediaManager> createState() => _MediaManagerState();
}

class _MediaManagerState extends State<MediaManager> {
  Json? data;
  Object? error;
  bool busy = false;
  late final int epoch = widget.api.epoch;
  bool get canEdit =>
      widget.editable &&
      data?['status'] == 'DRAFT' &&
      epoch == widget.api.epoch;
  Json get reference => {
    'revisionId': data!['revisionId'],
    'version': data!['version'],
    'expectedToken': data!['mediaToken'],
  };
  @override
  void initState() {
    super.initState();
    widget.api.addListener(sessionChanged);
    reload();
  }

  void sessionChanged() {
    if (epoch != widget.api.epoch && mounted) {
      setState(() {
        data = null;
        error = const ApiFailure('SESSION_CHANGED');
      });
    }
  }

  @override
  void dispose() {
    widget.api.removeListener(sessionChanged);
    super.dispose();
  }

  Future<void> reload() async {
    await run(
      () => widget.api.request(
        'GET',
        '${widget.path}/images',
        query: widget.editable
            ? null
            : {'revisionId': widget.profile['revisionId']},
      ),
    );
  }

  Future<void> run(Future<Json> Function() operation) async {
    if (busy || epoch != widget.api.epoch) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await operation();
      if (mounted && epoch == widget.api.epoch) setState(() => data = result);
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> upload() async {
    if (!canEdit || busy) return;
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
      );
      if (file == null || !mounted) return;
      final size = await file.length();
      if ((size ?? 0) > 8 * 1024 * 1024) {
        if (mounted) {
          setState(() => error = const ApiFailure('PAYLOAD_TOO_LARGE'));
        }
        return;
      }
      final bytes = await file.readAsBytes();
      if (!mounted || !canEdit) return;
      await run(
        () => widget.api.request(
          'POST',
          '${widget.path}/images',
          query: reference,
          bytes: bytes,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(
          () => error = e is ApiFailure ? e : const ApiFailure('INVALID_IMAGE'),
        );
      }
    }
  }

  Future<void> arrange(List<Json> images, String coverId) => run(
    () => widget.api.request(
      'PUT',
      '${widget.path}/images/order',
      body: {
        ...reference,
        'imageIds': images.map((image) => image['id']).toList(),
        'coverImageId': coverId,
      },
    ),
  );
  Future<void> move(int index, int offset) async {
    final images = records(data!['images']), item = images.removeAt(index);
    images.insert(index + offset, item);
    final cover = images.firstWhere((image) => image['isCover'] == true);
    await arrange(images, cover['id'] as String);
  }

  Future<void> remove(Json image) async {
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Gỡ ảnh khỏi bản nháp?'),
        content: const Text(
          'Ảnh trong các phiên bản đã duyệt và lịch sử vẫn được giữ lại.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Gỡ ảnh'),
          ),
        ],
      ),
    );
    if (accepted == true && mounted) {
      await run(
        () => widget.api.request(
          'DELETE',
          '${widget.path}/images/${image['id']}',
          body: reference,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final images = records(data?['images']);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hình ảnh hồ sơ'),
        actions: [
          IconButton(
            tooltip: 'Tải lại hình ảnh',
            onPressed: busy ? null : reload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (busy) const LinearProgressIndicator(),
          if (error != null) ErrorPanel(error!, retry: reload),
          if (!widget.editable || (data != null && !canEdit))
            const Notice(
              'Ảnh của phiên bản này chỉ được xem. Chọn sửa hồ sơ và lưu bản nháp mới để thay đổi ảnh.',
            ),
          Text('${images.length}/12 ảnh · JPEG, PNG, WebP · Tối đa 8 MB/ảnh'),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: busy || !canEdit || images.length >= 12 ? null : upload,
            icon: const Icon(Icons.add_photo_alternate_outlined),
            label: const Text('Tải ảnh lên'),
          ),
          if (data != null && images.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Chưa có hình ảnh.'),
            ),
          for (final (index, image) in images.indexed)
            Card(
              clipBehavior: Clip.antiAlias,
              margin: const EdgeInsets.only(top: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ApiPhoto(
                    api: widget.api,
                    url: image['url'] as String,
                    height: 190,
                    width: double.infinity,
                    label:
                        'Ảnh ${index + 1}${image['isCover'] == true ? ', ảnh bìa' : ''}',
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8),
                    child: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('Ảnh ${index + 1}'),
                        IconButton(
                          tooltip: image['isCover'] == true
                              ? 'Ảnh bìa'
                              : 'Đặt làm ảnh bìa',
                          onPressed: busy || !canEdit
                              ? null
                              : () => arrange(images, image['id'] as String),
                          icon: Icon(
                            image['isCover'] == true
                                ? Icons.star
                                : Icons.star_outline,
                          ),
                        ),
                        IconButton(
                          tooltip: 'Đưa ảnh lên trước',
                          onPressed: busy || !canEdit || index == 0
                              ? null
                              : () => move(index, -1),
                          icon: const Icon(Icons.arrow_upward),
                        ),
                        IconButton(
                          tooltip: 'Đưa ảnh ra sau',
                          onPressed:
                              busy || !canEdit || index == images.length - 1
                              ? null
                              : () => move(index, 1),
                          icon: const Icon(Icons.arrow_downward),
                        ),
                        IconButton(
                          tooltip: 'Gỡ ảnh',
                          onPressed: busy || !canEdit
                              ? null
                              : () => remove(image),
                          icon: const Icon(Icons.delete_outline),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class ArchiveAction extends StatefulWidget {
  const ArchiveAction({
    super.key,
    required this.api,
    required this.path,
    required this.profile,
    required this.archived,
    required this.onChanged,
    this.enabled = true,
  });
  final TourismApi api;
  final String path;
  final Json profile;
  final bool archived, enabled;
  final VoidCallback onChanged;
  @override
  State<ArchiveAction> createState() => _ArchiveActionState();
}

class _ArchiveActionState extends State<ArchiveAction> {
  bool busy = false;
  Object? error;
  Future<void> change() async {
    final reason = await askReason(
      context,
      widget.archived ? 'Khôi phục hồ sơ' : 'Xóa và lưu trữ hồ sơ',
      description: widget.archived
          ? 'Khôi phục hồ sơ về trạng thái trước khi lưu trữ. Nội dung đủ điều kiện có thể được công khai trở lại.'
          : 'Hồ sơ sẽ ngừng hiển thị công khai. Lịch sử, hình ảnh và các cam kết đã có được giữ lại; bạn có thể khôi phục sau.',
    );
    if (reason == null || !mounted) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.request(
        widget.archived ? 'POST' : 'DELETE',
        '${widget.path}${widget.archived ? '/restore' : ''}',
        body: {
          'revisionId': widget.profile['revisionId'],
          'version': widget.profile['version'],
          'reason': reason,
        },
      );
      if (mounted) widget.onChanged();
    } catch (e) {
      if (mounted) setState(() => error = e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      if (error != null) ErrorPanel(error!),
      OutlinedButton.icon(
        onPressed: busy || !widget.enabled ? null : change,
        icon: Icon(widget.archived ? Icons.restore : Icons.delete_outline),
        label: Text(
          busy
              ? 'Đang xử lý…'
              : widget.archived
              ? 'Khôi phục hồ sơ'
              : 'Xóa / lưu trữ',
        ),
      ),
    ],
  );
}
