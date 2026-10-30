import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../data.dart' show money;
import '../widgets.dart' show green, gray, mint, Panel;
import 'api.dart';

const labels = {
  'CUSTOMER': 'Khách thành viên',
  'HOUSEHOLD': 'Chủ hộ',
  'ADMIN': 'Quản trị viên',
  'DRAFT': 'Bản nháp',
  'PENDING': 'Chờ xét duyệt',
  'APPROVED': 'Đã duyệt',
  'REJECTED': 'Cần điều chỉnh',
  'REVOKED': 'Đã thu hồi phê duyệt',
  'AVAILABLE': 'Đang cung cấp',
  'PAUSED': 'Tạm ngừng',
  'RETIRED': 'Ngừng hẳn',
  'VISIBLE': 'Công khai',
  'HIDDEN': 'Đang ẩn',
  'SHARED': 'Bán ghép',
  'EXCLUSIVE': 'Thuê riêng',
  'PER_NIGHT': 'Theo đêm',
  'PER_PERSON': 'Theo người',
  'PER_GROUP': 'Theo nhóm',
  'PER_TRIP': 'Theo chuyến',
  'FIXED_PACKAGE': 'Gói cố định',
  'PER_HOUR': 'Theo giờ',
  'PER_UNIT': 'Theo đơn vị',
  'SERVICE': 'Dịch vụ',
  'PRODUCT': 'Sản phẩm giới thiệu',
  'CONTENT': 'Nội dung',
};
String label(dynamic value) => labels[value] ?? value?.toString() ?? 'Chưa có';
String displayError(Object error) => error is ApiFailure
    ? error.display
    : 'Chưa thể hoàn tất thao tác. Vui lòng thử lại.';
dynamic at(Json data, String key) {
  dynamic result = data;
  for (final part in key.split('.')) {
    result = result is Map ? result[part] : null;
  }
  return result;
}

void put(Json data, String key, dynamic value) {
  final parts = key.split('.');
  Json cursor = data;
  for (final part in parts.take(parts.length - 1)) {
    cursor = cursor.putIfAbsent(part, () => <String, dynamic>{}) as Json;
  }
  cursor[parts.last] = value;
}

String titleOf(Json row) =>
    object(row['profile'])['title'] as String? ??
    row['title'] as String? ??
    row['name'] as String? ??
    'Chưa đặt tên';
String objectId(Json row, String root) =>
    object(row[root])['id']?.toString() ?? row['id'].toString();
String dateLabel(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '');
  if (date == null) return 'Chưa có';
  final local = date.toUtc().add(const Duration(hours: 7));
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
}

class StatusBadge extends StatelessWidget {
  const StatusBadge(this.status, {super.key});
  final dynamic status;
  @override
  Widget build(BuildContext context) => Chip(
    label: Text(label(status), style: const TextStyle(fontSize: 12)),
    backgroundColor: status == 'REJECTED' || status == 'REVOKED'
        ? const Color(0xFFFFEEE8)
        : mint,
    side: BorderSide.none,
    visualDensity: VisualDensity.compact,
  );
}

class Notice extends StatelessWidget {
  const Notice(this.text, {super.key, this.error = false, this.action});
  final String text;
  final bool error;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    margin: const EdgeInsets.symmetric(vertical: 8),
    decoration: BoxDecoration(
      color: error ? const Color(0xFFFFEEE8) : mint,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          text,
          style: TextStyle(
            color: error ? const Color(0xFF8E3021) : green,
            height: 1.5,
          ),
        ),
        ?action,
      ],
    ),
  );
}

class ErrorPanel extends StatelessWidget {
  const ErrorPanel(this.error, {super.key, this.retry});
  final Object error;
  final VoidCallback? retry;
  @override
  Widget build(BuildContext context) => Notice(
    displayError(error),
    error: true,
    action: retry == null
        ? null
        : TextButton.icon(
            onPressed: retry,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
          ),
  );
}

class EmptyPanel extends StatelessWidget {
  const EmptyPanel(this.text, {super.key, this.action});
  final String text;
  final Widget? action;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Panel(
      child: Column(
        children: [
          const Icon(Icons.spa_outlined, size: 36, color: gray),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(height: 1.6, color: gray),
          ),
          if (action != null)
            Padding(padding: const EdgeInsets.only(top: 12), child: action),
        ],
      ),
    ),
  );
}

class PageButtons extends StatelessWidget {
  const PageButtons({
    super.key,
    required this.page,
    required this.total,
    required this.onPage,
    this.pageSize = 20,
    this.busy = false,
  });
  final int page, total, pageSize;
  final bool busy;
  final ValueChanged<int> onPage;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: Row(
      children: [
        IconButton(
          tooltip: 'Trang trước',
          onPressed: !busy && page > 1 ? () => onPage(page - 1) : null,
          icon: const Icon(Icons.chevron_left),
        ),
        Expanded(
          child: Text(
            'Trang $page · $total kết quả',
            textAlign: TextAlign.center,
            style: const TextStyle(color: gray, fontSize: 12),
          ),
        ),
        IconButton(
          tooltip: 'Trang sau',
          onPressed: !busy && page * pageSize < total
              ? () => onPage(page + 1)
              : null,
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    ),
  );
}

Future<String?> askReason(
  BuildContext context,
  String title, {
  String action = 'Xác nhận',
  String? description,
}) async {
  final controller = TextEditingController(), form = GlobalKey<FormState>();
  final result = await showDialog<String>(
    context: context,
    builder: (dialog) => AlertDialog(
      title: Text(title),
      content: Form(
        key: form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (description != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(description),
              ),
            TextFormField(
              controller: controller,
              autofocus: true,
              maxLines: 4,
              maxLength: 2000,
              decoration: const InputDecoration(labelText: 'Lý do'),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Vui lòng nhập lý do'
                  : null,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialog),
          child: const Text('Để sau'),
        ),
        FilledButton(
          onPressed: () {
            if (form.currentState!.validate()) {
              Navigator.pop(dialog, controller.text.trim());
            }
          },
          child: Text(action),
        ),
      ],
    ),
  );
  // The dialog owns this controller until its reverse transition completes.
  await Future<void>.delayed(const Duration(milliseconds: 300));
  controller.dispose();
  return result;
}

enum InputKind {
  text,
  paragraph,
  integer,
  decimal,
  phone,
  email,
  password,
  time,
  lines,
  choice,
  reference,
  toggle,
  addons,
  sections,
}

class ReferenceSource {
  const ReferenceSource(
    this.path, {
    this.query = const {},
    this.root = '',
    this.public = false,
  });
  final String path, root;
  final Map<String, dynamic> query;
  final bool public;
}

class FieldSpec {
  const FieldSpec(
    this.key,
    this.label, {
    this.kind = InputKind.text,
    this.required = false,
    this.min = 0,
    this.max = 999999999999999,
    this.minLength = 0,
    this.maxLength = 2000,
    this.maxItems = 32,
    this.itemLength = 500,
    this.hint,
    this.choices = const {},
    this.source,
    this.pattern,
    this.readOnly = false,
    this.showWhenKey,
    this.showWhenValue,
  });
  final String key, label;
  final InputKind kind;
  final bool required, readOnly;
  final num min, max;
  final int minLength, maxLength, maxItems, itemLength;
  final String? hint, pattern;
  final Map<String, String> choices;
  final ReferenceSource? source;
  final String? showWhenKey, showWhenValue;
}

class DataForm extends StatefulWidget {
  const DataForm({
    super.key,
    required this.api,
    required this.title,
    required this.fields,
    required this.save,
    this.initial = const {},
    this.description,
    this.action = 'Lưu nháp',
    this.validatePayload,
    this.memberOnly = true,
  });
  final TourismApi api;
  final String title, action;
  final String? description;
  final List<FieldSpec> fields;
  final Json initial;
  final Future<Json> Function(Json data) save;
  final String? Function(Json)? validatePayload;
  final bool memberOnly;
  @override
  State<DataForm> createState() => _DataFormState();
}

class _DataFormState extends State<DataForm> {
  late final int sessionEpoch = widget.api.epoch;
  final _form = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  final _values = <String, dynamic>{};
  final _referenceTitles = <String, String>{};
  bool _busy = false;
  bool _showPassword = false;
  Object? _error;
  final _fieldErrors = <String, String>{};
  @override
  void initState() {
    super.initState();
    for (final f in widget.fields) {
      final value = at(widget.initial, f.key);
      _values[f.key] = value;
      if (![
        InputKind.choice,
        InputKind.reference,
        InputKind.toggle,
        InputKind.addons,
        InputKind.sections,
      ].contains(f.kind)) {
        _controllers[f.key] = TextEditingController(
          text: f.kind == InputKind.lines
              ? (value is List ? value.join('\n') : '')
              : value?.toString() ?? '',
        );
      }
      if (f.kind == InputKind.reference && value != null) {
        resolveReference(f, value.toString());
      }
    }
  }

  Future<void> resolveReference(FieldSpec field, String id) async {
    final source = field.source!;
    try {
      final data = await widget.api.request(
        'GET',
        source.root.isEmpty ? source.path : '${source.path}/$id',
        query: source.root.isEmpty ? {...source.query, 'pageSize': 100} : null,
        authenticated: !source.public,
      );
      final matches = source.root.isEmpty
          ? records(data['items']).where((row) => row['id'].toString() == id)
          : [data];
      if (mounted &&
          matches.isNotEmpty &&
          _values[field.key]?.toString() == id) {
        setState(() => _referenceTitles[field.key] = titleOf(matches.first));
      }
    } catch (_) {
      // Retain the existing reference when its display label is unavailable.
    }
  }

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  String? _validate(FieldSpec f, String? input) {
    final value = f.kind == InputKind.password
        ? (input ?? '')
        : (input?.trim() ?? '');
    if (value.isEmpty) {
      return f.required ? 'Vui lòng nhập ${f.label.toLowerCase()}' : null;
    }
    if (f.kind == InputKind.lines) {
      final rows = value
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
      if (rows.length > f.maxItems ||
          rows.any((s) => s.length > f.itemLength)) {
        return 'Tối đa ${f.maxItems} dòng, mỗi dòng ${f.itemLength} ký tự';
      }
    } else if (value.length < f.minLength || value.length > f.maxLength) {
      return 'Nhập từ ${f.minLength} đến ${f.maxLength} ký tự';
    }
    if (f.kind == InputKind.integer) {
      if (!(f.min < 0 ? RegExp(r'^-?\d+$') : RegExp(r'^\d+$')).hasMatch(
        value,
      )) {
        return 'Nhập số nguyên';
      }
      final number = int.tryParse(value);
      if (number == null || number < f.min || number > f.max) {
        return 'Giá trị từ ${f.min} đến ${f.max}';
      }
    }
    if (f.kind == InputKind.decimal) {
      final number = double.tryParse(value);
      if (number == null ||
          !number.isFinite ||
          number < f.min ||
          number > f.max) {
        return 'Giá trị từ ${f.min} đến ${f.max}';
      }
    }
    if (f.kind == InputKind.time &&
        !RegExp(r'^([01][0-9]|2[0-3]):[0-5][0-9]$').hasMatch(value)) {
      return 'Nhập giờ HH:mm, ví dụ 14:00';
    }
    if (f.kind == InputKind.email &&
        !RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value)) {
      return 'Email chưa hợp lệ';
    }
    if (f.kind == InputKind.phone &&
        (value.length < 8 ||
            value.length > 32 ||
            !RegExp(r'^\+?[0-9 ()-]+$').hasMatch(value))) {
      return 'Số điện thoại từ 8 đến 32 ký tự';
    }
    if (f.pattern != null && !RegExp(f.pattern!).hasMatch(value)) {
      return 'Định dạng chưa hợp lệ';
    }
    return _fieldErrors[f.key];
  }

  bool visible(FieldSpec field) =>
      field.showWhenKey == null ||
      _values[field.showWhenKey] == field.showWhenValue;
  Json payload() {
    final result = <String, dynamic>{};
    for (final f in widget.fields) {
      if (!visible(f)) continue;
      dynamic value;
      if (_controllers.containsKey(f.key)) {
        final text = _controllers[f.key]!.text;
        final trimmed = f.kind == InputKind.password ? text : text.trim();
        if (trimmed.isEmpty &&
            !f.required &&
            ![
              InputKind.lines,
              InputKind.paragraph,
              InputKind.text,
            ].contains(f.kind)) {
          continue;
        }
        value = switch (f.kind) {
          InputKind.integer => int.tryParse(trimmed),
          InputKind.decimal => double.tryParse(trimmed),
          InputKind.lines =>
            trimmed
                .split('\n')
                .map((s) => s.trim())
                .where((s) => s.isNotEmpty)
                .toList(),
          _ => trimmed,
        };
        if (trimmed.isEmpty &&
            !f.required &&
            (f.kind == InputKind.text ||
                (f.kind == InputKind.paragraph && f.key != 'body'))) {
          continue;
        }
      } else {
        value = _values[f.key];
        if (f.kind == InputKind.toggle) value = value == true;
        if ([InputKind.addons, InputKind.sections].contains(f.kind)) {
          value = value ?? [];
        }
      }
      if (value == null && f.kind != InputKind.reference) continue;
      put(result, f.key, value);
    }
    return result;
  }

  Future<void> submit() async {
    if (widget.memberOnly && widget.api.epoch != sessionEpoch) {
      return;
    }
    _fieldErrors.clear();
    if (!_form.currentState!.validate() || _busy) return;
    final data = payload(), message = widget.validatePayload?.call(payload());
    if (message != null) {
      setState(() => _error = ApiFailure('VALIDATION_ERROR'));
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(message)));
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.save(data);
      if (mounted) Navigator.pop(context, result);
    } catch (error) {
      if (mounted) {
        if (error is ApiFailure) {
          for (final issue in error.issues) {
            final path = issue['path'];
            if (path is List) {
              _fieldErrors[path.join('.')] = 'Vui lòng kiểm tra lại thông tin';
            }
          }
        }
        setState(() => _error = error);
        _form.currentState?.validate();
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> editCollection(FieldSpec field, {int? index}) async {
    final rows = records(_values[field.key]);
    final addon = field.kind == InputKind.addons;
    final fields = addon
        ? const [
            FieldSpec(
              'key',
              'Mã phụ phí',
              required: true,
              maxLength: 64,
              pattern: r'^[A-Za-z0-9_-]+$',
            ),
            FieldSpec('name', 'Tên phụ phí', required: true, maxLength: 150),
            FieldSpec(
              'unitPriceVnd',
              'Giá VND',
              kind: InputKind.integer,
              required: true,
            ),
            FieldSpec(
              'maxQuantity',
              'Số lượng tối đa',
              kind: InputKind.integer,
              required: true,
              min: 1,
              max: 100000,
            ),
            FieldSpec('isActive', 'Đang áp dụng', kind: InputKind.toggle),
          ]
        : const [
            FieldSpec(
              'heading',
              'Tiêu đề đoạn',
              required: true,
              maxLength: 150,
            ),
            FieldSpec(
              'text',
              'Nội dung đoạn',
              kind: InputKind.paragraph,
              required: true,
              maxLength: 4000,
            ),
          ];
    final result = await Navigator.push<Json>(
      context,
      MaterialPageRoute(
        builder: (_) => DataForm(
          api: widget.api,
          title: addon ? 'Khoản phụ phí' : 'Phần giới thiệu',
          action: 'Lưu phần này',
          fields: fields,
          initial: index == null ? {'isActive': true} : rows[index],
          description: addon
              ? 'Chỉ thêm khoản không cần giữ tài nguyên riêng. Xe đạp, thuyền hoặc thiết bị hữu hạn phải được kiểm tra khả dụng.'
              : null,
          validatePayload: (data) =>
              addon &&
                  rows.asMap().entries.any(
                    (entry) =>
                        entry.key != index && entry.value['key'] == data['key'],
                  )
              ? 'Mã phụ phí không được trùng'
              : null,
          save: (data) async => {...data, if (addon) 'resourceFree': true},
        ),
      ),
    );
    if (result != null && mounted) {
      setState(() {
        if (index == null) {
          rows.add(result);
        } else {
          rows[index] = result;
        }
        _values[field.key] = rows;
      });
    }
  }

  Widget field(FieldSpec f) {
    if (f.kind == InputKind.toggle) {
      return SwitchListTile.adaptive(
        contentPadding: EdgeInsets.zero,
        title: Text(f.label),
        value: _values[f.key] == true,
        onChanged: _busy || f.readOnly
            ? null
            : (v) => setState(() => _values[f.key] = v),
      );
    }
    if (f.kind == InputKind.choice) {
      final value = _values[f.key]?.toString();
      final choices = {
        ...f.choices,
        if (value != null && !f.choices.containsKey(value))
          value: 'Giá trị đã lưu',
      };
      return DropdownButtonFormField<String>(
        key: ValueKey('field-${f.key}'),
        initialValue: value,
        decoration: InputDecoration(labelText: f.label, helperText: f.hint),
        isExpanded: true,
        items: choices.entries
            .map(
              (e) => DropdownMenuItem(
                value: e.key,
                child: Text(e.value, overflow: TextOverflow.ellipsis),
              ),
            )
            .toList(),
        onChanged: _busy || f.readOnly
            ? null
            : (v) => setState(() => _values[f.key] = v),
        validator: (value) => f.required && value == null
            ? 'Vui lòng chọn ${f.label.toLowerCase()}'
            : _fieldErrors[f.key],
      );
    }
    if (f.kind == InputKind.reference) {
      return FormField<String>(
        initialValue: _values[f.key]?.toString(),
        validator: (value) => f.required && _values[f.key] == null
            ? 'Vui lòng chọn ${f.label.toLowerCase()}'
            : _fieldErrors[f.key],
        builder: (state) => Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            OutlinedButton.icon(
              key: ValueKey('field-${f.key}'),
              onPressed: _busy || f.readOnly
                  ? null
                  : () async {
                      final row = await Navigator.push<Json>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ReferencePicker(
                            api: widget.api,
                            title: f.label,
                            source: f.source!,
                            nullable: !f.required,
                          ),
                        ),
                      );
                      if (row != null && mounted) {
                        setState(() {
                          _values[f.key] = row['id'];
                          _referenceTitles[f.key] = row['title'];
                          state.didChange(row['id']);
                        });
                      }
                    },
              icon: const Icon(Icons.location_on_outlined),
              label: Text(
                '${f.label}: ${_referenceTitles[f.key] ?? (_values[f.key] != null ? 'Đã lưu lựa chọn' : 'Chưa chọn')}',
              ),
            ),
            if (f.hint != null)
              Text(f.hint!, style: const TextStyle(color: gray, fontSize: 12)),
            if (state.errorText != null)
              Text(
                state.errorText!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
          ],
        ),
      );
    }
    if ([InputKind.addons, InputKind.sections].contains(f.kind)) {
      final rows = records(_values[f.key]);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(f.label, style: const TextStyle(fontWeight: FontWeight.bold)),
          for (final (index, row) in rows.indexed)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text((row['name'] ?? row['heading']).toString()),
              subtitle: Text(
                f.kind == InputKind.addons
                    ? '${money(row['unitPriceVnd'] as int)} · tối đa ${row['maxQuantity']}'
                    : row['text'].toString(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              onTap: _busy ? null : () => editCollection(f, index: index),
              trailing: IconButton(
                tooltip: 'Bỏ phần này',
                onPressed: _busy
                    ? null
                    : () => setState(() {
                        rows.removeAt(index);
                        _values[f.key] = rows;
                      }),
                icon: const Icon(Icons.remove_circle_outline),
              ),
            ),
          if (rows.length < f.maxItems)
            TextButton.icon(
              onPressed: _busy ? null : () => editCollection(f),
              icon: const Icon(Icons.add),
              label: const Text('Thêm một phần'),
            ),
        ],
      );
    }
    return TextFormField(
      key: ValueKey('field-${f.key}'),
      controller: _controllers[f.key],
      readOnly: _busy || f.readOnly,
      obscureText: f.kind == InputKind.password && !_showPassword,
      autocorrect: f.kind != InputKind.password,
      enableSuggestions: f.kind != InputKind.password,
      maxLines: [InputKind.paragraph, InputKind.lines].contains(f.kind) ? 4 : 1,
      keyboardType: switch (f.kind) {
        InputKind.integer => TextInputType.numberWithOptions(signed: f.min < 0),
        InputKind.decimal => const TextInputType.numberWithOptions(
          decimal: true,
          signed: true,
        ),
        InputKind.email => TextInputType.emailAddress,
        InputKind.phone => TextInputType.phone,
        _ => TextInputType.text,
      },
      autofillHints: f.kind == InputKind.password
          ? [AutofillHints.password]
          : f.kind == InputKind.email
          ? [AutofillHints.email]
          : null,
      inputFormatters: f.kind == InputKind.integer
          ? [
              f.min < 0
                  ? FilteringTextInputFormatter.allow(RegExp(r'[-0-9]'))
                  : FilteringTextInputFormatter.digitsOnly,
            ]
          : null,
      decoration: InputDecoration(
        labelText: '${f.label}${f.required ? ' *' : ''}',
        helperText: f.hint,
        suffixIcon: f.kind == InputKind.password
            ? IconButton(
                tooltip: _showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu',
                onPressed: _busy
                    ? null
                    : () => setState(() => _showPassword = !_showPassword),
                icon: Icon(
                  _showPassword
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
              )
            : null,
      ),
      validator: (value) => _validate(f, value),
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.api,
    builder: (context, _) {
      if (widget.memberOnly &&
          (!widget.api.signedIn || widget.api.epoch != sessionEpoch)) {
        return const Scaffold(
          body: Center(child: Text('Vui lòng đăng nhập lại.')),
        );
      }
      return PopScope(
        canPop: !_busy,
        child: Scaffold(
          appBar: AppBar(title: Text(widget.title)),
          bottomNavigationBar: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: FilledButton(
                onPressed: _busy ? null : submit,
                child: Text(_busy ? 'Đang lưu…' : widget.action),
              ),
            ),
          ),
          body: Form(
            key: _form,
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (widget.description != null) Notice(widget.description!),
                if (_error != null) ErrorPanel(_error!),
                for (final f in widget.fields)
                  if (visible(f))
                    Padding(
                      key: ValueKey('row-${f.key}'),
                      padding: const EdgeInsets.only(bottom: 20),
                      child: field(f),
                    ),
              ],
            ),
          ),
        ),
      );
    },
  );
}

class ReferencePicker extends StatefulWidget {
  const ReferencePicker({
    super.key,
    required this.api,
    required this.title,
    required this.source,
    this.nullable = false,
  });
  final TourismApi api;
  final String title;
  final ReferenceSource source;
  final bool nullable;
  @override
  State<ReferencePicker> createState() => _ReferencePickerState();
}

class _ReferencePickerState extends State<ReferencePicker> {
  int page = 1;
  late Future<Json> future;
  @override
  void initState() {
    super.initState();
    load();
  }

  void load() {
    future = widget.api.request(
      'GET',
      widget.source.path,
      query: {...widget.source.query, 'page': page, 'pageSize': 20},
      authenticated: !widget.source.public,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.title)),
    body: FutureBuilder<Json>(
      future: future,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Padding(
            padding: const EdgeInsets.all(20),
            child: ErrorPanel(snapshot.error!, retry: () => setState(load)),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data!, rows = records(data['items']);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (widget.nullable)
              ListTile(
                title: const Text('Không chọn'),
                onTap: () =>
                    Navigator.pop(context, {'id': null, 'title': 'Chưa chọn'}),
              ),
            if (rows.isEmpty)
              const EmptyPanel(
                'Chưa có lựa chọn. Hãy tạo điểm phục vụ hoặc nhờ quản trị viên bổ sung danh mục.',
              ),
            for (final row in rows)
              ListTile(
                title: Text(titleOf(row)),
                subtitle: Text(
                  widget.source.root.isEmpty
                      ? label(row['kind'])
                      : '${label(object(row['profile'])['status'])} · ${label(object(row[widget.source.root])['supplyStatus'])}',
                ),
                onTap: () => Navigator.pop(context, {
                  'id': objectId(row, widget.source.root),
                  'title': titleOf(row),
                }),
              ),
            PageButtons(
              page: page,
              total: data['total'] as int,
              onPage: (value) => setState(() {
                page = value;
                load();
              }),
            ),
          ],
        );
      },
    ),
  );
}

class ContentSummary extends StatelessWidget {
  const ContentSummary({super.key, required this.profile, required this.kind});
  final Json profile;
  final String kind;
  @override
  Widget build(BuildContext context) {
    final details = object(profile['details']),
        terms = object(profile['terms']);
    final entries = <String, dynamic>{
      'Địa chỉ': details['address'],
      'Địa phương': details['locality'],
      'Số liên hệ': details['contactPhone'],
      'Zalo': details['zaloContact'],
      'Hướng dẫn đến': details['directions'],
      'Số khách tối đa': profile['maxGuests'],
      'Nhận phòng': profile['checkInTime'],
      'Trả phòng': profile['checkOutTime'],
      if (profile['nightlyPriceSnapshotVnd'] != null)
        'Giá lúc gửi duyệt': money(profile['nightlyPriceSnapshotVnd'] as int),
      if (profile['defaultDurationMinutes'] != null)
        'Thời lượng': '${profile['defaultDurationMinutes']} phút',
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          profile['title']?.toString() ?? '',
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        Text(
          profile['body']?.toString() ?? '',
          style: const TextStyle(height: 1.65),
        ),
        for (final entry in entries.entries)
          if (entry.value != null)
            Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(
                '${entry.key}: ${entry.value}',
                style: const TextStyle(height: 1.5),
              ),
            ),
        for (final (heading, value) in [
          ('Tiện nghi', details['amenities']),
          ('Nội quy', details['houseRules']),
          ('Điều kiện tham gia', details['participationConditions']),
          ('Cần chuẩn bị', details['preparationNotes']),
          ('Bao gồm', terms['includedItems']),
          ('Không bao gồm', terms['excludedItems']),
        ])
          if (value is List && value.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    heading,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  for (final text in value)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text('• $text'),
                    ),
                ],
              ),
            ),
        for (final section in records(details['introductionSections']))
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  section['heading'].toString(),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                Text(section['text'].toString()),
              ],
            ),
          ),
        if (profile['reviewNote'] != null)
          Notice('Kết quả xét duyệt: ${profile['reviewNote']}'),
      ],
    );
  }
}
