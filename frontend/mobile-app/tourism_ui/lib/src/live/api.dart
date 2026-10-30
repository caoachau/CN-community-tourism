import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

typedef Json = Map<String, dynamic>;
Json object(dynamic value) =>
    value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};
List<Json> records(dynamic value) =>
    value is List ? value.map(object).toList() : [];

const errorMessages = {
  'INVALID_CREDENTIALS':
      'Email hoặc mật khẩu chưa đúng, hoặc tài khoản không còn hoạt động.',
  'EMAIL_ALREADY_EXISTS': 'Email này đã có tài khoản.',
  'ACCOUNT_BLOCKED': 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
  'UNAUTHENTICATED': 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.',
  'FORBIDDEN': 'Bạn không có quyền thao tác dữ liệu này.',
  'HOUSEHOLD_NOT_APPROVED': 'Hộ chưa được phê duyệt để cung cấp dịch vụ mới.',
  'HOUSEHOLD_ALREADY_EXISTS':
      'Bạn đã có hồ sơ hộ dân. Hãy tải lại hồ sơ hiện tại.',
  'HOUSEHOLD_PROFILE_INCOMPLETE': 'Bổ sung tên, mô tả, địa chỉ, địa phương và số liên hệ trước khi gửi duyệt.',
  'PLACE_PROFILE_INCOMPLETE':
      'Bổ sung tên, mô tả, địa chỉ và địa phương trước khi gửi duyệt.',
  'SERVICE_PROFILE_INCOMPLETE':
      'Bổ sung tên và mô tả dịch vụ trước khi gửi duyệt.',
  'ROOM_PROFILE_INCOMPLETE':
      'Bổ sung tên, mô tả và cấu hình lưu trú trước khi gửi duyệt.',
  'SERVICE_PLACE_NOT_READY':
      'Chọn điểm phục vụ của hộ đã duyệt, đang cung cấp và hiển thị.',
  'ROOM_PLACE_NOT_READY':
      'Chọn điểm lưu trú của hộ đã duyệt, đang cung cấp và hiển thị.',
  'INVALID_SERVICE_CATEGORY': 'Chọn danh mục dịch vụ đang hoạt động.',
  'SERVICE_OFFER_INVALID':
      'Cần ít nhất một phương thức bán đang bật, có phạm vi phục vụ rõ ràng.',
  'SERVICE_OFFER_LIMIT': 'Một dịch vụ có tối đa 32 phương thức bán đang bật.',
  'OFFER_CONFIGURATION_LOCKED': 'Phương thức bán đã được gửi duyệt hoặc sử dụng. Hãy tạo phương thức thay thế.',
  'ROOM_CONFIGURATION_LOCKED': 'Phòng còn cam kết phục vụ. Chưa thể đổi điểm, sức chứa hoặc giờ nhận/trả.',
  'STALE_VERSION': 'Dữ liệu đã thay đổi trên thiết bị khác. Hãy tải lại, đối chiếu rồi thao tác lại.',
  'INVALID_STATE':
      'Trạng thái hiện tại không cho phép thao tác này. Hãy tải lại dữ liệu.',
  'VALIDATION_ERROR':
      'Thông tin chưa hợp lệ. Kiểm tra các trường được đánh dấu.',
  'RATE_LIMITED': 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.',
  'NOT_FOUND': 'Nội dung không tồn tại hoặc không còn được công khai.',
  'INVALID_REQUEST':
      'Thông tin chưa hợp lệ. Kiểm tra lại thời gian và dữ liệu đã nhập.',
  'SLOT_NOT_READY': 'Khung giờ cần dịch vụ, điểm và phương thức bán đã duyệt, cùng xác nhận sẵn sàng phục vụ.',
  'AVAILABILITY_CONFLICT': 'Khoảng thời gian này đã hết sức chứa hoặc trùng với lịch chặn/phân bổ khác.',
  'CALENDAR_COMMITMENT_CONFLICT': 'Thay đổi này ảnh hưởng đến cam kết đặt chỗ hoặc tài nguyên đang được sử dụng.',
  'RESOURCE_CODE_EXISTS': 'Hộ đã có tài nguyên với mã này.',
  'HOLD_EXPIRED': 'Yêu cầu đã hết hạn giữ chỗ. Vui lòng kiểm tra và đặt lại.',
  'HOLD_LIMIT': 'Bạn có tối đa 5 yêu cầu đang giữ chỗ. Hủy yêu cầu không cần thiết hoặc chờ hết hạn.',
  'QUOTE_CHANGED':
      'Giá hoặc điều kiện đã thay đổi. Hãy lấy báo giá mới và kiểm tra lại.',
  'FINANCIAL_CONFLICT':
      'Khoản tiền vượt số được thu/hoàn hoặc mâu thuẫn với chứng từ trước.',
  'REVIEW_ALREADY_EXISTS': 'Booking này đã được đánh giá.',
  'IDEMPOTENCY_CONFLICT':
      'Yêu cầu thử lại có nội dung khác lần trước. Hãy tải lại dữ liệu.',
  'CART_HOUSEHOLD_MISMATCH': 'Mỗi giỏ đặt chỗ dành cho một hộ. Hoàn tất hoặc gỡ giỏ hiện tại trước khi chọn hộ khác.',
  'CART_LIMIT': 'Mỗi giỏ có tối đa 20 phòng và khung giờ dịch vụ.',
  'BOOKING_REQUEST_PENDING': 'Có yêu cầu chưa xác định kết quả. Mở giỏ và thử lại yêu cầu trước khi chỉnh sửa.',
  'INVALID_IMAGE': 'Chọn ảnh JPEG, PNG hoặc WebP hợp lệ, tối đa 25 megapixel.',
  'IMAGE_LIMIT': 'Mỗi hồ sơ có tối đa 12 ảnh.',
  'PAYLOAD_TOO_LARGE': 'Ảnh quá lớn. Vui lòng chọn ảnh không quá 8 MB.',
  'MEDIA_STORAGE_UNAVAILABLE':
      'Chưa thể lưu hoặc tải ảnh. Vui lòng thử lại sau.',
};

class ApiFailure implements Exception {
  const ApiFailure(this.code, {this.requestId, this.issues = const []});
  final String code;
  final String? requestId;
  final List<Json> issues;
  String get message =>
      errorMessages[code] ??
      switch (code) {
        'NETWORK_ERROR' =>
          'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.',
        'TIMEOUT' => 'Máy chủ phản hồi chậm. Vui lòng thử lại.',
        'CONFIGURATION' =>
          'Cần cấu hình địa chỉ API hợp lệ. Bản phát hành sử dụng HTTPS.',
        'SESSION_CHANGED' =>
          'Phiên làm việc đã thay đổi. Vui lòng mở lại màn hình.',
        _ => 'Chưa thể hoàn tất thao tác. Vui lòng thử lại.',
      };
  String get display =>
      requestId == null ? message : '$message\nMã hỗ trợ: $requestId';
  @override
  String toString() => message;
}

abstract interface class RefreshVault {
  Future<String?> read();
  Future<void> write(String? token);
}

class DeviceRefreshVault implements RefreshVault {
  final _storage = const FlutterSecureStorage();
  // Browser sessions stay in memory. Never put JWT/refresh tokens in localStorage.
  String? _browserToken;
  @override
  Future<String?> read() async =>
      kIsWeb ? _browserToken : _storage.read(key: 'ctp_refresh');
  @override
  Future<void> write(String? token) async {
    if (kIsWeb) {
      _browserToken = token;
      return;
    }
    if (token == null) {
      await _storage.delete(key: 'ctp_refresh');
    } else {
      await _storage.write(key: 'ctp_refresh', value: token);
    }
  }
}

class TourismApi extends ChangeNotifier {
  TourismApi({http.Client? client, RefreshVault? vault, String? baseUrl})
    : _client = client ?? http.Client(),
      _vault = vault ?? DeviceRefreshVault(),
      baseUrl = baseUrl ?? configuredBaseUrl();
  final http.Client _client;
  final RefreshVault _vault;
  final String baseUrl;
  Json? user;
  String? _accessToken, _refreshToken;
  Future<void>? _refreshing;
  int? _refreshEpoch;
  Future<void> _vaultQueue = Future<void>.value();
  bool restoring = true, _disposed = false;
  int _epoch = 0;
  String? sessionNotice;
  bool get signedIn => user != null;
  bool get isHousehold => user?['role'] == 'HOUSEHOLD';
  int get epoch => _epoch;
  final List<Json> _bookingCart = [];
  String? bookingHouseholdId;
  int bookingCartRevision = 0;
  Json? pendingBookingRequest, pendingBookingQuote;
  List<Json> get bookingCart => List.unmodifiable(_bookingCart);
  void addBookingItem(String householdId, String title, Json payload) {
    if (!signedIn) throw const ApiFailure('UNAUTHENTICATED');
    if (pendingBookingRequest != null) {
      throw const ApiFailure('BOOKING_REQUEST_PENDING');
    }
    if (_bookingCart.isNotEmpty && bookingHouseholdId != householdId) {
      throw const ApiFailure('CART_HOUSEHOLD_MISMATCH');
    }
    final identifier = payload['kind'] == 'ROOM'
        ? payload['roomId']
        : payload['slotId'];
    final index = _bookingCart.indexWhere((row) {
      final item = object(row['payload']);
      return item['kind'] == payload['kind'] &&
          (item['roomId'] ?? item['slotId']) == identifier;
    });
    if (index < 0 && _bookingCart.length >= 20) {
      throw const ApiFailure('CART_LIMIT');
    }
    final row = <String, dynamic>{'title': title, 'payload': payload};
    if (index < 0) {
      _bookingCart.add(row);
    } else {
      _bookingCart[index] = row;
    }
    bookingHouseholdId = householdId;
    bookingCartRevision++;
    _notify();
  }

  void removeBookingItem(int index) {
    if (pendingBookingRequest != null) {
      throw const ApiFailure('BOOKING_REQUEST_PENDING');
    }
    _bookingCart.removeAt(index);
    if (_bookingCart.isEmpty) bookingHouseholdId = null;
    bookingCartRevision++;
    _notify();
  }

  void clearBookingCart() {
    pendingBookingRequest = null;
    pendingBookingQuote = null;
    _bookingCart.clear();
    bookingHouseholdId = null;
    bookingCartRevision++;
    _notify();
  }

  static String configuredBaseUrl() {
    const value = String.fromEnvironment('API_BASE_URL');
    if (value.isNotEmpty) return value.replaceFirst(RegExp(r'/+$'), '');
    return kIsWeb
        ? 'http://localhost:5000/api/v1'
        : 'http://10.0.2.2:5000/api/v1';
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Uri _uri(String path, Map<String, dynamic>? query) {
    final root = Uri.tryParse(baseUrl);
    final local =
        root != null &&
        ['localhost', '127.0.0.1', '10.0.2.2', '::1'].contains(root.host);
    if (root == null ||
        !root.hasAuthority ||
        root.userInfo.isNotEmpty ||
        root.query.isNotEmpty ||
        root.fragment.isNotEmpty ||
        (root.scheme != 'https' &&
            !(root.scheme == 'http' && (kDebugMode || local)))) {
      throw const ApiFailure('CONFIGURATION');
    }
    return Uri.parse('${baseUrl.replaceFirst(RegExp(r'/+$'), '')}$path')
        .replace(
          queryParameters: {
            for (final entry in (query ?? {}).entries)
              if (entry.value != null && entry.value.toString().isNotEmpty)
                entry.key: entry.value.toString(),
          },
        );
  }

  Future<Json> _send(
    String method,
    String path, {
    Json? body,
    Map<String, dynamic>? query,
    String? token,
    Uint8List? bytes,
    bool binary = false,
  }) async {
    try {
      final request = http.Request(method, _uri(path, query));
      request.headers['Accept'] = binary ? 'image/webp' : 'application/json';
      if (token != null) request.headers['Authorization'] = 'Bearer $token';
      if (body != null) {
        request.headers['Content-Type'] = 'application/json';
        request.body = jsonEncode(body);
      }
      if (bytes != null) {
        request.headers['Content-Type'] = 'application/octet-stream';
        request.bodyBytes = bytes;
      }
      final response = await _client
          .send(request)
          .then(http.Response.fromStream)
          .timeout(const Duration(seconds: 25));
      if (binary &&
          response.statusCode == 200 &&
          response.headers['content-type']?.startsWith('image/webp') == true) {
        return {'bytes': response.bodyBytes};
      }
      Json payload;
      try {
        payload = object(jsonDecode(utf8.decode(response.bodyBytes)));
      } catch (_) {
        throw const ApiFailure('INVALID_RESPONSE');
      }
      if (response.statusCode < 200 ||
          response.statusCode >= 300 ||
          payload['success'] != true) {
        final error = object(payload['error']);
        throw ApiFailure(
          error['code'] as String? ?? 'INVALID_RESPONSE',
          requestId: object(payload['meta'])['requestId'] as String?,
          issues: records(error['details']),
        );
      }
      return object(payload['data']);
    } on ApiFailure {
      rethrow;
    } on TimeoutException {
      throw const ApiFailure('TIMEOUT');
    } catch (_) {
      throw const ApiFailure('NETWORK_ERROR');
    }
  }

  Future<void> _accept(Json session, int expectedEpoch) async {
    if (_epoch != expectedEpoch || _disposed) {
      throw const ApiFailure('SESSION_CHANGED');
    }
    final token = session['refreshToken'] as String?,
        access = session['accessToken'] as String?;
    if (token == null || access == null || object(session['user']).isEmpty) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
    await _storeRefresh(token, expectedEpoch);
    if (_epoch != expectedEpoch || _disposed) {
      throw const ApiFailure('SESSION_CHANGED');
    }
    _refreshToken = token;
    _accessToken = access;
    user = object(session['user']);
    sessionNotice = null;
    _notify();
  }

  Future<void> restore() async {
    final generation = _epoch;
    try {
      final stored = await _vault.read();
      if (generation != _epoch || _disposed) return;
      _refreshToken = stored;
      if (_refreshToken != null) await _refresh();
    } on ApiFailure catch (error) {
      if (!['UNAUTHENTICATED', 'ACCOUNT_BLOCKED'].contains(error.code)) {
        sessionNotice = error.message;
      }
    } catch (_) {
      sessionNotice = 'Không thể khôi phục phiên. Bạn có thể đăng nhập lại.';
    } finally {
      restoring = false;
      _notify();
    }
  }

  Future<void> _refresh() async {
    if (_refreshing != null && _refreshEpoch == _epoch) return _refreshing!;
    final generation = _epoch, token = _refreshToken;
    if (token == null) throw const ApiFailure('UNAUTHENTICATED');
    final future = () async {
      try {
        await _accept(
          await _send('POST', '/auth/refresh', body: {'refreshToken': token}),
          generation,
        );
      } on ApiFailure catch (error) {
        if (['UNAUTHENTICATED', 'ACCOUNT_BLOCKED'].contains(error.code) &&
            generation == _epoch) {
          await clearSession(notice: error.message);
        }
        rethrow;
      }
    }();
    _refreshing = future;
    _refreshEpoch = generation;
    try {
      await future;
    } finally {
      if (identical(_refreshing, future)) {
        _refreshing = null;
        _refreshEpoch = null;
      }
    }
  }

  Future<Json> request(
    String method,
    String path, {
    Json? body,
    Map<String, dynamic>? query,
    bool authenticated = true,
    Uint8List? bytes,
    bool binary = false,
  }) async {
    final generation = _epoch, usedToken = _accessToken;
    if (authenticated && _accessToken == null) {
      throw const ApiFailure('UNAUTHENTICATED');
    }
    try {
      Json data;
      try {
        data = await _send(
          method,
          path,
          body: body,
          query: query,
          token: authenticated ? _accessToken : null,
          bytes: bytes,
          binary: binary,
        );
      } on ApiFailure catch (error) {
        if (!authenticated || error.code != 'UNAUTHENTICATED') rethrow;
        if (generation != _epoch) throw const ApiFailure('SESSION_CHANGED');
        if (usedToken == _accessToken) await _refresh();
        data = await _send(
          method,
          path,
          body: body,
          query: query,
          token: _accessToken,
          bytes: bytes,
          binary: binary,
        );
      }
      if (authenticated && generation != _epoch) {
        throw const ApiFailure('SESSION_CHANGED');
      }
      return data;
    } on ApiFailure catch (error) {
      if (authenticated &&
          generation == _epoch &&
          ['UNAUTHENTICATED', 'ACCOUNT_BLOCKED'].contains(error.code)) {
        await clearSession(notice: error.message);
      }
      rethrow;
    }
  }

  Future<Uint8List> imageBytes(String path, {bool authenticated = true}) async {
    if (!RegExp(r'^/media/[a-f0-9-]{36}\.webp$').hasMatch(path)) {
      throw const ApiFailure('INVALID_RESPONSE');
    }
    final data = await request(
      'GET',
      path,
      binary: true,
      authenticated: authenticated,
    );
    return data['bytes'] as Uint8List;
  }

  Future<void> authenticate(Json input, {bool register = false}) async {
    final generation = ++_epoch;
    clearBookingCart();
    await _accept(
      await _send(
        'POST',
        register ? '/auth/register' : '/auth/login',
        body: input,
      ),
      generation,
    );
    restoring = false;
  }

  Future<void> currentUser() async {
    if (!signedIn) return;
    final data = await request('GET', '/auth/me');
    user = object(data['user']);
    _notify();
  }

  Future<void> clearSession({String? notice}) async {
    _epoch++;
    pendingBookingRequest = null;
    pendingBookingQuote = null;
    _bookingCart.clear();
    bookingHouseholdId = null;
    bookingCartRevision++;
    user = null;
    _accessToken = null;
    _refreshToken = null;
    sessionNotice = notice;
    try {
      await _storeRefresh(null, _epoch);
    } finally {
      _notify();
    }
  }

  Future<void> logout() async {
    try {
      await request('POST', '/auth/logout', body: {});
    } finally {
      await clearSession();
    }
  }

  Future<void> _storeRefresh(String? token, int generation) {
    final work = _vaultQueue.then((_) async {
      if (generation == _epoch && !_disposed) await _vault.write(token);
    });
    _vaultQueue = work.catchError((Object _) {});
    return work;
  }

  @override
  void dispose() {
    _disposed = true;
    _epoch++;
    _client.close();
    super.dispose();
  }
}
